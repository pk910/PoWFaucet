# Deployment
1. Open Actions tab
2. Select `Build docker image for latest release`:

   ![image](https://github.com/bobanetwork/Faucet/assets/28724551/b2ee60f4-a8ce-4545-aca4-4e12381d7ffe)

4. Trigger workflow to deploy new docker image for the network you want to deploy an update for:

   ![image](https://github.com/bobanetwork/Faucet/assets/28724551/7560e76b-f727-418b-885a-9f5e8ea5446b)

Docker images and project itself unfortunately doesn't work with environment variables. 



## Docker tags
Images are tagged in 2 ways: 

1. `v2-stable-{network}` (e.g. v2-stable-bobagoerli = Boba Goerli testnet faucet)
2. `v{Major.Minor.Patch}-{network}` (e.g. v2.0.8-bobabnbtestnet = Boba BNB testnet faucet v2.0.8)

Upstream also pushes new images on every push to the master branch. 
I disabled this for the time being to reduce the consumption of GH action minutes as I don't see an immediate reason to have these images. 

## AWS KMS
This faucet supports AWS KMS. 

### Create AWS KMS key
1. Open the right AWS account & go to the KMS management console
2. Create new key and choose following configuration: 
- Type: Asymmetric
- Usage: Signing & verification
- Specification: ECC_SECG_P256K1
- Origin: KMS
- Regional: Multi-region key

### Adapt the faucet-config
To enable it you need to remove or comment the private key config in the `faucet-config.yaml`.

```yaml
#ethWalletKey: "0x.."
```

And then add the following configuration: 

```yaml
# Alternatively to providing the ethWalletKey we can use awsKMS
awsKmsAccessKey: ""
awsKmsSecretKey: ""
awsKmsKeyId: ""
awsKmsEndpoint: ""
awsKmsRegion: ""
```
