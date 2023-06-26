# PoWFaucet

Modularized faucet for EVM chains with different protection methods (Captcha, Mining, IP, Mainnet Balance, Gitcoin Passport and more)

<b>Warning: The master branch of this repository is now pointing to the new modularized v2 version of the faucet.</b>

The v2 version is not compatible with the pow-only v1 configuration or database schema! When upgrading a v1 instance, you need to delete the old database file and recreate the configuration.
Read through the [Faucet Operator Wiki](https://github.com/pk910/PoWFaucet/wiki/Operator-Wiki) to see the installation and configuration instructions.

The latest version of the v1 faucet can be fetched via the v1 branch. I'll keep it updated in case any issues come up on v1, but don't expect any new features :)

# Why

Faucets for ETH Testnets are spammed by bots. This faucet tries to reduce the efficiency of these automated requests by various protection methods.

This faucet is mostly known for its proof-of-work based protection, which is currently the best and most reliable way to distribute funds on a network that got low on fund reserves.

For clarification: This faucet does NOT generate new coins with the "mining" process.
It's just one of the protection methods the faucet uses to prevent anyone from requesting big amount of funds and draining the faucet wallet.
If you want to run your own instance you need to transfer the funds you want to distribute to the faucet wallet yourself!

For a more detailed description, take a look into the [Project Wiki](https://github.com/pk910/PoWFaucet/wiki)

# Instances

<table>
  <thead>
    <tr>
      <th>Testnet</th>
      <th>Link</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Goerli Testnet</td>
      <td><a href="https://goerli-faucet.pk910.de">https://goerli-faucet.pk910.de</a></td>
      <td>
        <a href="#"><img alt="Faucet Version" src="https://img.shields.io/endpoint?url=https%3A%2F%2Ffaucets.pk910.de%2Fbadges%2Fversion.php%3Ffaucet%3Dgoerli-faucet" /></a>
        <a href="https://stats.uptimerobot.com/lW1jltO2k0/794659716"><img alt="Uptime Robot ratio (30 days)" src="https://img.shields.io/uptimerobot/ratio/m794659716-25637f4701eec63fca289bbf" /></a>
        <a href="https://goerli.etherscan.io/address/0x6Cc9397c3B38739daCbfaA68EaD5F5D77Ba5F455"><img alt="Faucet Balance" src="https://img.shields.io/endpoint?url=https%3A%2F%2Ffaucets.pk910.de%2Fbadges%2Fbalance.php%3Ffaucet%3Dgoerli-faucet" /></a>
      </td>
    </tr>
    <tr>
      <td>Sepolia Testnet</td>
      <td><a href="https://sepolia-faucet.pk910.de">https://sepolia-faucet.pk910.de</a></td>
      <td>
        <a href="#"><img alt="Faucet Version" src="https://img.shields.io/endpoint?url=https%3A%2F%2Ffaucets.pk910.de%2Fbadges%2Fversion.php%3Ffaucet%3Dsepolia-faucet" /></a>
        <a href="https://stats.uptimerobot.com/lW1jltO2k0/794659718"><img alt="Uptime Robot ratio (30 days)" src="https://img.shields.io/uptimerobot/ratio/m794659718-c8c94ebdcae5283c5df1a5ad" /></a>
        <a href="https://sepolia.etherscan.io/address/0x6Cc9397c3B38739daCbfaA68EaD5F5D77Ba5F455"><img alt="Faucet Balance" src="https://img.shields.io/endpoint?url=https%3A%2F%2Ffaucets.pk910.de%2Fbadges%2Fbalance.php%3Ffaucet%3Dsepolia-faucet" /></a>
      </td>
    </tr>
    <tr>
      <td><a href="https://github.com/ephemery-testnet/ephemery-resources">Ephemery Testnet</a></td>
      <td><a href="https://ephemery-faucet.pk910.de">https://ephemery-faucet.pk910.de</a></td>
      <td>
        <a href="#"><img alt="Faucet Version" src="https://img.shields.io/endpoint?url=https%3A%2F%2Ffaucets.pk910.de%2Fbadges%2Fversion.php%3Ffaucet%3Dephemery-faucet" /></a>
        <a href="https://stats.uptimerobot.com/lW1jltO2k0/794659832"><img alt="Uptime Robot ratio (30 days)" src="https://img.shields.io/uptimerobot/ratio/m794659832-bc531ed47aa35b919d3f8d98" /></a>
        <a href="https://explorer.ephemery.dev/address/0x6Cc9397c3B38739daCbfaA68EaD5F5D77Ba5F455"><img alt="Faucet Balance" src="https://img.shields.io/endpoint?url=https%3A%2F%2Ffaucets.pk910.de%2Fbadges%2Fbalance.php%3Ffaucet%3Dephemery-faucet" /></a>
      </td>
    </tr>
  </tbody>
</table>

# Run Yourself

Read the [Faucet Operator Wiki](https://github.com/pk910/PoWFaucet/wiki/Operator-Wiki) to see the installation and configuration instructions.

# Bugs & Features

Please feel free to report bugs and add new features via PRs if you like.

# Thanks To

This faucet contains parts of code from the following projects:

[pow-captcha](https://git.sequentialread.com/forest/pow-captcha) - faucet-wasm build script

[FaucETH](https://github.com/komputing/FaucETH) - faucet page design

# License

AGPLv3
