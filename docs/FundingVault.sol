// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

interface IFundingVault {
  function notifyPledgeTransfer(uint32 pledgeId) external;
}

interface IFundingVaultToken is IERC721Enumerable {
  function pledgeOwner(uint256 tokenId) external view returns (address);
  function pledgeUpdate(uint64 tokenId, address targetAddr) external;
  function pledgeRange(uint32 pledgeIndex, uint32 rangeSize) external view returns (uint32[] memory, uint32, uint32);
}

contract FundingVaultToken is ERC721Enumerable, IFundingVaultToken {
  address private _fundingVault;

  constructor(address fundingVault) ERC721("Funding Pledge", "FundPlg") {
    _fundingVault = fundingVault;
  }

  receive() external payable {
    if(msg.value > 0) {
      (bool sent, ) = payable(_fundingVault).call{value: msg.value}("");
      require(sent, "failed to forward ether");
    }
  }

  function getVault() public view returns (address) {
    return _fundingVault;
  }

  function _baseURI() internal view override returns (string memory) {
    return string(abi.encodePacked("https://dev.pk910.de/ethvault/meta.php?chain=", Strings.toString(block.chainid), "&vault=",  Strings.toHexString(uint160(_fundingVault), 20), "&pledge="));
  }

  function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal virtual override {
    super._beforeTokenTransfer(from, to, tokenId, batchSize);

    IFundingVault(_fundingVault).notifyPledgeTransfer(uint32(tokenId));
  }

  function pledgeOwner(uint256 tokenId) public view returns (address) {
    return _ownerOf(tokenId);
  }

  function pledgeUpdate(uint64 tokenId, address targetAddr) public {
    require(_msgSender() == _fundingVault, "not vault contract");

    if(targetAddr != address(0)) {
      if(!_exists(tokenId)) {
        _safeMint(targetAddr, tokenId);
      }
      else if(_ownerOf(tokenId) != targetAddr) {
        _safeTransfer(_ownerOf(tokenId), targetAddr, tokenId, "");
      }
    }
    else if(_exists(tokenId)) {
      _burn(tokenId);
    }
  }

  function pledgeRange(uint32 pledgeIndex, uint32 rangeSize) public view returns (uint32[] memory, uint32, uint32) {
    uint32 pledgeCount = uint32(totalSupply());
    if(rangeSize > pledgeCount) {
      rangeSize = pledgeCount;
    }
    if(pledgeIndex >= pledgeCount) {
      pledgeIndex = 0;
    }

    uint32[] memory pledgeIdRange = new uint32[](rangeSize);
    for(uint32 index = 0; index < rangeSize; index++) {
      pledgeIdRange[index] = uint32(tokenByIndex(pledgeIndex));

      pledgeIndex++;
      if(pledgeIndex >= pledgeCount) {
        pledgeIndex = 0;
      }
    }

    return (pledgeIdRange, pledgeIndex, pledgeCount);
  }

}

import "@openzeppelin/contracts/access/AccessControl.sol";


/* A Pledge represents a promised portion of the locked vault funds
* portion size factor is `severity / _pledgeSeverity`
*/
struct Pledge {
  uint32 tokenId;
  uint32 severity;
  uint64 lastClaimTime;
  uint128 perDayLimit;
  uint256 claimLimit;
}

struct PledgeTimeCache {
  uint64 cacheTime;
  uint64 totalSeverity;
  int96 totalPledgeTime;
  uint32 maintIndex;
}

contract FundingVaultStorage {
  // slot 0x01
  address internal _vaultTokenAddr;

  // slot 0x02
  uint64 internal _vaultCreationTime;
  uint64 internal _endOfLifeTime;
  uint32 internal _maintBatchSizePerClaim = 5;
  uint32 internal _pledgeIdCounter = 1;
  uint64 internal _claimTransferLockTime = 86400 * 2; // 2 days

  // slot 0x03
  uint256 internal _totalDepositAmount = 0;

  // slot 0x04
  uint256 internal _storedVaultBalance = 0;

  // slot 0x05
  PledgeTimeCache internal _pledgeTimeCache;

  // slot 0x06 - 0x0f (11 slots for future use) 
  bytes32[10] internal _unused;

  // mappings
  mapping(uint32 => Pledge) internal _pledges;
  mapping(uint32 => uint64) internal _pledgeClaimLock;
}

contract FundingVault is FundingVaultStorage, AccessControl {
  bytes32 public constant PLEDGE_MANAGER_ROLE = keccak256("PLEDGE_MANAGER_ROLE");

  event PledgeTimeCacheResynced(uint64 cachedSeverity, uint64 calculatedSeverity, int128 cachedPledgeTime, int128 calculatedPledgeTime);
  event PledgeTimeReset(uint64 indexed pledgeId, int64 claimTimeChange, int96 pledgeTimeChange);
  event PledgeLocked(uint64 indexed pledgeId, uint64 lockTime, uint64 lockTimeout);
  event PledgeClaim(uint64 indexed pledgeId, address indexed to, uint256 amount, uint64 pledgeTimeUsed);
  
  constructor(address owner, uint64 eol) {
    _grantRole(DEFAULT_ADMIN_ROLE, owner);
    _grantRole(PLEDGE_MANAGER_ROLE, owner);
    _endOfLifeTime = eol;
    _vaultTokenAddr = address(new FundingVaultToken(address(this)));

    uint64 intervalTime = _intervalTime();
    _vaultCreationTime = intervalTime;
    _pledgeTimeCache = PledgeTimeCache({
      cacheTime: intervalTime,
      totalSeverity: 0,
      totalPledgeTime: 0,
      maintIndex: 0
    });
  }

  receive() external payable {
  }


  //## Admin configuration / rescue functions

  function setEndOfLife(uint64 eol) public onlyRole(DEFAULT_ADMIN_ROLE) {
    _endOfLifeTime = eol;
  }

  function setMaintBatchSizePerClaim(uint32 batchSize) public onlyRole(DEFAULT_ADMIN_ROLE) {
    _maintBatchSizePerClaim = batchSize;
  }

  function setClaimTransferLockTime(uint64 lockTime) public onlyRole(DEFAULT_ADMIN_ROLE) {
    _claimTransferLockTime = lockTime;
  }

  function rescueCall(address addr, uint256 amount, bytes calldata data) public onlyRole(DEFAULT_ADMIN_ROLE) {
    uint balance = address(this).balance;
    require(balance >= amount, "amount exceeds wallet balance");

    (bool sent, ) = payable(addr).call{value: amount}(data);
    require(sent, "call failed");
  }

  function rescueClaim(uint32 pledgeId, uint256 amount, address target) public onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
    require(_pledges[pledgeId].severity > 0, "pledge not found");

    _trackVaultBalance();
    _refreshPledgeTimeCache(0);

    uint256 claimAmount = _claim(pledgeId, amount, target);
    if(amount > 0) {
      require(claimAmount == amount, "claim failed");
    }
    else {
      require(claimAmount > 0, "claim failed");
    }
    return claimAmount;
  }


  //## Public view functions

  function getVaultToken() public view returns (address) {
    return _vaultTokenAddr;
  }

  function getEndOfLife() public view returns (uint64) {
    return _endOfLifeTime;
  }

  function getRemainingTime() public view returns (uint64) {
    if(_endOfLifeTime > uint64(block.timestamp)) {
      return _endOfLifeTime - uint64(block.timestamp);
    }
    else {
      return 0;
    }
  }

  function getUnlockedBalance() public view returns (uint256) {
    // get distribution balance (amount of funds that is `unlocked` and free for distribution)
    uint256 distributionBalance = address(this).balance;
    uint256 totalDepositAmount = _totalDepositAmount;
    if(distributionBalance > totalDepositAmount) {
      totalDepositAmount = distributionBalance;
    }

    uint64 currentTime = _intervalTime();
    uint64 creationTime = _vaultCreationTime;
    uint64 endOfLifeTime = _endOfLifeTime;
    if(endOfLifeTime > creationTime && endOfLifeTime > currentTime) {
      uint256 lockedBalance = totalDepositAmount * (endOfLifeTime - currentTime) / (endOfLifeTime - creationTime);
      if(distributionBalance > lockedBalance) {
        distributionBalance = distributionBalance - lockedBalance;
      }
      else {
        distributionBalance = 0;
      }
    }

    return distributionBalance;
  }

  function getLockedBalance() public view returns (uint256) {
    return address(this).balance - getUnlockedBalance();
  }

  function getTotalPledgeTime() public view returns (int96) {
    // get total pledge time
    uint64 cacheAge = _intervalTime() - _pledgeTimeCache.cacheTime;
    return _pledgeTimeCache.totalPledgeTime + int64(cacheAge * _pledgeTimeCache.totalSeverity);
  }

  function getPledgeTimeRate() public view returns (uint256) {
    int96 totalPledgeTime = getTotalPledgeTime();
    if(totalPledgeTime <= 0) {
      return 0;
    }
    return getUnlockedBalance() / uint96(getTotalPledgeTime());
  }

  function getPledges() public view returns (Pledge[] memory) {
    IFundingVaultToken vaultToken = IFundingVaultToken(_vaultTokenAddr);
    uint32 pledgeCount = uint32(vaultToken.totalSupply());
    Pledge[] memory pledges = new Pledge[](pledgeCount);
    for(uint32 pledgeIdx = 0; pledgeIdx < pledgeCount; pledgeIdx++) {
      uint32 pledgeId = uint32(vaultToken.tokenByIndex(pledgeIdx));
      pledges[pledgeIdx] = _pledges[pledgeId];
    }
    return pledges;
  }

  function getPledge(uint32 pledgeId) public view returns (Pledge memory) {
    require(_pledges[pledgeId].severity > 0, "pledge not found");
    return _pledges[pledgeId];
  }

  function getPledgeLockTime(uint32 pledgeId) public view returns (uint64) {
    require(_pledges[pledgeId].severity > 0, "pledge not found");
    if(_pledgeClaimLock[pledgeId] > uint64(block.timestamp)) {
      return _pledgeClaimLock[pledgeId] - uint64(block.timestamp);
    }
    else {
      return 0;
    }
  }

  function getClaimableBalance() public view returns (uint256) {
    uint256 claimableAmount = 0;
    IFundingVaultToken vaultToken = IFundingVaultToken(_vaultTokenAddr);

    uint128 pledgeCount = uint32(vaultToken.balanceOf(_msgSender()));
    for(uint32 pledgeIdx = 0; pledgeIdx < pledgeCount; pledgeIdx++) {
      uint32 pledgeId = uint32(vaultToken.tokenOfOwnerByIndex(_msgSender(), pledgeIdx));
      claimableAmount += _claimableBalance(pledgeId);
    }
    return claimableAmount;
  }

  function getClaimableBalance(uint32 pledgeId) public view returns (uint256) {
    require(_pledges[pledgeId].severity > 0, "pledge not found");
    return _claimableBalance(pledgeId);
  }

  function _claimableBalance(uint32 pledgeId) internal view returns (uint256) {
    if(_pledgeClaimLock[pledgeId] >= uint64(block.timestamp)) {
      return 0;
    }
    uint256 distributionBalance = getUnlockedBalance();
    int96 totalPledgeTime = getTotalPledgeTime();
    (, , uint256 claimBalance) = _calculatePledgeClaimBalance(distributionBalance, totalPledgeTime, _intervalTime(), pledgeId);
    return claimBalance;
  }

  function getClaimPledgeTime(uint32 pledgeId) public view returns (uint64, uint64) {
    uint256 distributionBalance = getUnlockedBalance();
    int96 totalPledgeTime = getTotalPledgeTime();
    (uint64 burnPledgeTime, uint64 usePledgeTime,) = _calculatePledgeClaimBalance(distributionBalance, totalPledgeTime, _intervalTime(), pledgeId);
    return (usePledgeTime, burnPledgeTime);
  }


  //## Internal helper functions

  function _ownerOf(uint32 tokenId) internal view returns (address) {
    return IFundingVaultToken(_vaultTokenAddr).pledgeOwner(tokenId);
  }

  function _intervalTime() internal view returns (uint64) {
    return uint64(block.timestamp);
  }

  function _trackVaultBalance() internal {
    uint256 currentBalance = address(this).balance;
    if(currentBalance > _storedVaultBalance) {
      _totalDepositAmount += currentBalance - _storedVaultBalance;
      _storedVaultBalance = currentBalance;
    }
    else if(currentBalance < _storedVaultBalance) {
      // untracked loss? :/
      _storedVaultBalance = currentBalance;
    }
  }

  function _calculatePledgeClaimBalance(uint256 distributionBalance, int96 totalPledgeTime, uint64 intervalTime, uint32 pledgeId) internal view returns (uint64, uint64, uint256) {
    Pledge memory pledge = _pledges[pledgeId];
    uint64 baseClaimTime = pledge.lastClaimTime;
    if(distributionBalance == 0 || totalPledgeTime <= 0 || baseClaimTime >= intervalTime) {
      return (0, 0, 0);
    }

    uint64 usePledgeTime = intervalTime - baseClaimTime;
    uint256 claimBalance = distributionBalance * (usePledgeTime * pledge.severity) / uint96(totalPledgeTime);
    uint256 limitedBalance = claimBalance;

    if(pledge.claimLimit > 0 && limitedBalance > pledge.claimLimit) {
      limitedBalance = pledge.claimLimit;
    }

    if(pledge.perDayLimit > 0 && (limitedBalance * 86400 / (intervalTime - baseClaimTime)) > pledge.perDayLimit) {
      limitedBalance = pledge.perDayLimit * (intervalTime - baseClaimTime) / 86400;
    }

    uint64 burnPledgeTime = 0;
    if(limitedBalance < claimBalance) {
      burnPledgeTime = uint64(usePledgeTime * (claimBalance - limitedBalance) / claimBalance);
      usePledgeTime -= burnPledgeTime;
    }
    return (burnPledgeTime, usePledgeTime, limitedBalance);
  }

  function _refreshPledgeTimeCache(uint32 maintBatchSize) internal {
    uint64 currentTime = _intervalTime();
    PledgeTimeCache memory pledgeTimeCache = _pledgeTimeCache;
    uint32 maintIndex = pledgeTimeCache.maintIndex;
    uint64 burnedPledgeTime = 0;

    // maintenance job (trim unclaimable pledge time)
    if(maintBatchSize > 0) {
      uint256 distributionBalance = getUnlockedBalance();
      int96 totalPledgeTime = getTotalPledgeTime();
      (uint32[] memory pledgeRange, uint32 nextMaintIndex, uint32 pledgeCount) = IFundingVaultToken(_vaultTokenAddr).pledgeRange(maintIndex, maintBatchSize);
      
      for(uint32 maintIdx = 0; maintIdx < pledgeCount; maintIdx++) {
        uint32 pledgeId = pledgeRange[maintIdx];
        (uint64 burnPledgeTime, , ) = _calculatePledgeClaimBalance(distributionBalance, totalPledgeTime, currentTime, pledgeId);
        if(burnPledgeTime > 0) {
          burnedPledgeTime += burnPledgeTime * _pledges[pledgeId].severity;
          _pledges[pledgeId].lastClaimTime += burnPledgeTime;
        }
      }

      maintIndex = nextMaintIndex;
    }

    uint64 refreshDuration = currentTime - pledgeTimeCache.cacheTime;
    _pledgeTimeCache = PledgeTimeCache({
      cacheTime: currentTime,
      totalSeverity: pledgeTimeCache.totalSeverity,
      totalPledgeTime: pledgeTimeCache.totalPledgeTime + int64(pledgeTimeCache.totalSeverity * refreshDuration) - int64(burnedPledgeTime),
      maintIndex: maintIndex
    });
  }


  //## Pledge managemnet functions (Plege Manager)

  function createPledge(address addr, uint32 severity, uint128 perDayLimit, uint256 claimLimit) public onlyRole(PLEDGE_MANAGER_ROLE) {
    require(severity > 0, "severity must be bigger than 0");

    uint32 pledgeId = _pledgeIdCounter++;
    _pledges[pledgeId] = Pledge({
      severity: severity,
      tokenId: pledgeId,
      lastClaimTime: _intervalTime(),
      perDayLimit: perDayLimit,
      claimLimit: claimLimit
    });

    _refreshPledgeTimeCache(0);
    _pledgeTimeCache.totalSeverity += severity;

    IFundingVaultToken(_vaultTokenAddr).pledgeUpdate(pledgeId, addr);
  }

  function updatePledge(uint32 pledgeId, uint32 severity, uint128 perDayLimit, uint256 claimLimit) public onlyRole(PLEDGE_MANAGER_ROLE) {
    require(_pledges[pledgeId].severity > 0, "pledge not found");
    require(severity > 0, "severity must be bigger than 0");

    uint32 oldSeverity = _pledges[pledgeId].severity;
    if(oldSeverity != severity) {
      _pledges[pledgeId].severity = severity;

      uint64 lastClaimDuration = _intervalTime() - _pledges[pledgeId].lastClaimTime;
      _refreshPledgeTimeCache(0);
      if(oldSeverity > severity) {
        _pledgeTimeCache.totalSeverity -= oldSeverity - severity;
        _pledgeTimeCache.totalPledgeTime -= int64(lastClaimDuration * (oldSeverity - severity));
      }
      else {
        _pledgeTimeCache.totalSeverity += severity - oldSeverity;
        _pledgeTimeCache.totalPledgeTime += int64(lastClaimDuration * (severity - oldSeverity));
      }
    }
    _pledges[pledgeId].perDayLimit = perDayLimit;
    _pledges[pledgeId].claimLimit = claimLimit;
  }

  function transferPledge(uint32 pledgeId, address addr) public onlyRole(PLEDGE_MANAGER_ROLE) {
    require(_pledges[pledgeId].severity > 0, "pledge not found");
    IFundingVaultToken(_vaultTokenAddr).pledgeUpdate(pledgeId, addr);
  }

  function resetPledgeBalance(uint32 pledgeId, uint256 targetBalance) public onlyRole(PLEDGE_MANAGER_ROLE) {
    Pledge memory pledge = _pledges[pledgeId];
    require(pledge.severity > 0, "pledge not found");
    require(pledge.claimLimit == 0 || pledge.claimLimit <= targetBalance, "target balance higher than claim limit");

    uint256 distributionBalance = getUnlockedBalance();
    require(distributionBalance >= targetBalance, "target balance higher than unlocked balance");

    _refreshPledgeTimeCache(0);
    int64 timeChange = 0;
    int96 pledgeTimeChange = 0;
    if(targetBalance == 0) {
      // just reset lastClaimTime
      timeChange = int64(_intervalTime() - pledge.lastClaimTime);
      pledgeTimeChange = timeChange * int32(pledge.severity) * -1;
      _pledges[pledgeId].lastClaimTime = _intervalTime();
    }
    else {
      int96 totalPledgeTime = getTotalPledgeTime();
      require(totalPledgeTime >= 0, "no unclaimed pledge time");

      uint64 targetClaimTime = uint64((targetBalance * uint96(totalPledgeTime) / distributionBalance) / pledge.severity) + 1;
      if(pledge.perDayLimit > 0) {
        uint64 limitedClaimTime = uint64(targetBalance * 86400 / pledge.perDayLimit) + 1;
        if(limitedClaimTime > targetClaimTime) {
          targetClaimTime = limitedClaimTime;
        }
      }
      timeChange = int64((_intervalTime() - pledge.lastClaimTime)) - int64(targetClaimTime);

      pledgeTimeChange = timeChange * int32(pledge.severity) * -1;
      _pledges[pledgeId].lastClaimTime = uint64(int64(pledge.lastClaimTime) + timeChange);
    }

    if(pledgeTimeChange != 0) {
      _pledgeTimeCache.totalPledgeTime += pledgeTimeChange;

      emit PledgeTimeReset(pledgeId, timeChange, pledgeTimeChange);
    }
  }

  function removePledge(uint32 pledgeId) public onlyRole(PLEDGE_MANAGER_ROLE) {
    require(_pledges[pledgeId].severity > 0, "pledge not found");

    IFundingVaultToken(_vaultTokenAddr).pledgeUpdate(pledgeId, address(0));

    _refreshPledgeTimeCache(0);
    uint64 lastClaimDuration = _intervalTime() - _pledges[pledgeId].lastClaimTime;
    uint32 pledgeSeverity = _pledges[pledgeId].severity;
    _pledgeTimeCache.totalSeverity -= pledgeSeverity;
    _pledgeTimeCache.totalPledgeTime -= int64(lastClaimDuration * pledgeSeverity);

    delete _pledges[pledgeId];
  }

  function resyncPledgeTimeCache() public onlyRole(PLEDGE_MANAGER_ROLE) {
    uint64 currentTime = _intervalTime();
    _refreshPledgeTimeCache(0);

    IFundingVaultToken vaultToken = IFundingVaultToken(_vaultTokenAddr);
    uint64 totalSeverity = 0;
    int96 totalPledgeTime = 0;
    uint32 pledgeCount = uint32(vaultToken.totalSupply());
    for(uint32 pledgeIdx = 0; pledgeIdx < pledgeCount; pledgeIdx++) {
      uint32 pledgeId = uint32(vaultToken.tokenByIndex(pledgeIdx));
      totalSeverity += _pledges[pledgeId].severity;
      totalPledgeTime += int64((currentTime - _pledges[pledgeId].lastClaimTime) * _pledges[pledgeId].severity);
    }

    if(_pledgeTimeCache.totalSeverity != totalSeverity || _pledgeTimeCache.totalPledgeTime != totalPledgeTime) {
      emit PledgeTimeCacheResynced(_pledgeTimeCache.totalSeverity, totalSeverity, _pledgeTimeCache.totalPledgeTime, totalPledgeTime);
      _pledgeTimeCache.totalSeverity = totalSeverity;
      _pledgeTimeCache.totalPledgeTime = totalPledgeTime;
    }
  }

  function lockPledge(uint32 pledgeId, uint64 lockTime) public {
    require(_pledges[pledgeId].severity > 0, "pledge not found");
    require(
      _msgSender() == _vaultTokenAddr || 
      _msgSender() == _ownerOf(pledgeId) || 
      hasRole(PLEDGE_MANAGER_ROLE, _msgSender())
    , "not pledge owner or manager");

    _lockPledge(pledgeId, lockTime);
  }

  function notifyPledgeTransfer(uint32 pledgeId) public {
    require(_pledges[pledgeId].severity > 0, "pledge not found");
    require(_msgSender() == _vaultTokenAddr, "not pledge token contract");

    _lockPledge(pledgeId, _claimTransferLockTime);
  }

  function _lockPledge(uint32 pledgeId, uint64 lockTime) internal {
    uint64 lockTimeout = uint64(block.timestamp) + lockTime;
    if(lockTimeout > _pledgeClaimLock[pledgeId] || hasRole(DEFAULT_ADMIN_ROLE, _msgSender())) {
      _pledgeClaimLock[pledgeId] = lockTimeout;
    }
    else {
      lockTime = 0;
      lockTimeout = _pledgeClaimLock[pledgeId];
    }
    emit PledgeLocked(pledgeId, lockTime, lockTimeout);
  }


  //## Maintenance function

  function maint(uint32 batchSize) public {
    IFundingVaultToken vaultToken = IFundingVaultToken(_vaultTokenAddr);
    require(vaultToken.balanceOf(_msgSender()) > 0, "not a token holder");
    
    _trackVaultBalance();
    if(batchSize == 0) {
      batchSize = uint32(vaultToken.totalSupply());
    }
    _refreshPledgeTimeCache(batchSize);
  }


  //## Public claim functions

  function claim(uint256 amount) public returns (uint256) {
    _trackVaultBalance();
    _refreshPledgeTimeCache(_maintBatchSizePerClaim);

    uint256 claimAmount = _claimAll(_msgSender(), amount, _msgSender());
    if(amount > 0) {
      require(claimAmount == amount, "claim failed");
    }
    else {
      require(claimAmount > 0, "claim failed");
    }
    return claimAmount;
  }

  function claim(uint32 pledgeId, uint256 amount) public returns (uint256) {
    require(_pledges[pledgeId].severity > 0, "pledge not found");
    require(_ownerOf(pledgeId) == _msgSender(), "not owner of this pledge");
    require(_pledgeClaimLock[pledgeId] < uint64(block.timestamp), "pledge is locked");

    _trackVaultBalance();
    _refreshPledgeTimeCache(_maintBatchSizePerClaim);

    uint256 claimAmount = _claim(pledgeId, amount, _msgSender());
    if(amount > 0) {
      require(claimAmount == amount, "claim failed");
    }
    else {
      require(claimAmount > 0, "claim failed");
    }
    return claimAmount;
  }

  function claimTo(uint256 amount, address target) public returns (uint256) {
    _trackVaultBalance();
    _refreshPledgeTimeCache(_maintBatchSizePerClaim);

    uint256 claimAmount = _claimAll(_msgSender(), amount, target);
    if(amount > 0) {
      require(claimAmount == amount, "claim failed");
    }
    else {
      require(claimAmount > 0, "claim failed");
    }
    return claimAmount;
  }

  function claimTo(uint32 pledgeId, uint256 amount, address target) public returns (uint256) {
    require(_pledges[pledgeId].severity > 0, "pledge not found");
    require(_ownerOf(pledgeId) == _msgSender(), "not owner of this pledge");
    require(_pledgeClaimLock[pledgeId] < uint64(block.timestamp), "pledge is locked");

    _trackVaultBalance();
    _refreshPledgeTimeCache(_maintBatchSizePerClaim);

    uint256 claimAmount = _claim(pledgeId, amount, target);
    if(amount > 0) {
      require(claimAmount == amount, "claim failed");
    }
    else {
      require(claimAmount > 0, "claim failed");
    }
    return claimAmount;
  }

  function _claimAll(address owner, uint256 amount, address target) internal returns (uint256) {
    uint256 claimAmount = 0;
    IFundingVaultToken vaultToken = IFundingVaultToken(_vaultTokenAddr);

    uint32 pledgeCount = uint32(vaultToken.balanceOf(owner));
    for(uint32 pledgeIdx = 0; pledgeIdx < pledgeCount; pledgeIdx++) {
      uint32 pledgeId = uint32(vaultToken.tokenOfOwnerByIndex(owner, pledgeIdx));
      uint256 claimed = _claim(pledgeId, amount, target);
      claimAmount += claimed;
      if(amount > 0) {
        if(amount == claimed) {
          break;
        }
        else {
          amount -= claimed;
        }
      }
    }
    return claimAmount;
  }

  function _claim(uint32 pledgeId, uint256 amount, address target) internal returns (uint256) {
    if(_pledgeClaimLock[pledgeId] >= uint64(block.timestamp)) {
      return 0;
    }

    uint256 distributionBalance = getUnlockedBalance();
    int96 totalPledgeTime = getTotalPledgeTime();
    (uint64 burnedPledgeTime, uint64 usedPledgeTime, uint256 claimBalance) = _calculatePledgeClaimBalance(distributionBalance, totalPledgeTime, _intervalTime(), pledgeId);
    if(claimBalance == 0) {
      return 0;
    }
    
    uint256 claimAmount = claimBalance;
    if(amount > 0 && claimAmount > amount) {
      claimAmount = amount;
      usedPledgeTime = uint64(usedPledgeTime * amount / claimBalance);
    }

    usedPledgeTime++; // round up

    _pledges[pledgeId].lastClaimTime += burnedPledgeTime + usedPledgeTime;
    _pledgeTimeCache.totalPledgeTime -= int64((burnedPledgeTime + usedPledgeTime) * _pledges[pledgeId].severity);
    _storedVaultBalance -= claimAmount;

    // send claim amount to target
    (bool sent, ) = payable(target).call{value: claimAmount}("");
    require(sent, "failed to send ether");

    emit PledgeClaim(pledgeId, target, claimAmount, usedPledgeTime);

    return claimAmount;
  }

}
