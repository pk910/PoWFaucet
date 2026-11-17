
ClientConfig
    prio 1: authenticatoor, captcha, ensname, github, passport, pow, zupass

SessionStart (concurrent: resolve the input, external lookups)
    prio 1: captcha, *maintenance_mode_check
    prio 2: authenticatoor, ticket-proof, voucher, whitelist, zupass, *start_module
    prio 3: ensname
    prio 5: *eth_address_check
    prio 6: github, passport
    prio 7: ethinfo, ipinfo, mainnet-wallet

SessionAdmit (one session at a time: limit checks, then setup; local work only)
    prio 2: authenticatoor, ticket-proof, zupass
    prio 6: github
    prio 7: concurrency-limit, recurring-limits
    prio 10: pow

SessionRestore
    prio 10: pow

SessionInfo
    prio 1: passport, pow

SessionRewardFactor
    prio 5: authenticatoor, faucet-outflow, github, passport
    prio 6: faucet-balance, ipinfo, whitelist

SessionRewarded
    prio 5: faucet-outflow

SessionIpChange
    prio 2: whitelist
    prio 6: concurrency-limit, ipinfo

SessionComplete
    prio 5: authenticatoor, github
    prio 10: pow

SessionClaim
    prio 1: captcha

SessionClaimed

SessionClose

