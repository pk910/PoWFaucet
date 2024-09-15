//go:build js && wasm

package main

import (
	"encoding/hex"
	"fmt"
	"hash"
	"math/big"
	"syscall/js"

	"golang.org/x/crypto/sha3"

	"github.com/btcsuite/btcd/btcec/v2"
	btc_ecdsa "github.com/btcsuite/btcd/btcec/v2/ecdsa"
)

var inputHash []byte
var outputSuffix []byte
var maxRounds int
var preimage *big.Int

func main2() {
	fmt.Println("Go Web Assembly")
	js.Global().Set("nmSetConfig", setConfig())
	js.Global().Set("nmHash", runHash())
	<-make(chan struct{})
}

func setConfig() js.Func {
	jsonFunc := js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) != 4 {
			return "Invalid no of arguments passed"
		}

		inputHash = fromHex(args[0].String())
		outputSuffix = fromHex(args[1].String())
		maxRounds = args[2].Int()
		preimageBytes := fromHex(args[3].String())
		preimageHash := keccak256(preimageBytes)
		preimage = new(big.Int)
		preimage.SetBytes(preimageHash[0:16])

		//fmt.Printf("input hash: 0x%x\n", inputHash)
		//fmt.Printf("output suffix: 0x%x\n", outputSuffix)
		//fmt.Printf("max rounds: %v\n", maxRounds)
		//fmt.Printf("preimage: %v\n", preimage)

		return nil
	})
	return jsonFunc
}

func runHash() js.Func {
	jsonFunc := js.FuncOf(func(this js.Value, args []js.Value) any {
		if len(args) != 1 {
			return "Invalid no of arguments passed"
		}

		inputNonceBytes := fromHex(args[0].String())
		inputNonce := new(big.Int).SetBytes(inputNonceBytes)
		inputNonce = inputNonce.Lsh(inputNonce, 16)

		//fmt.Printf("input nonce: %v\n", inputNonce.Uint64())

		var bestNonce *big.Int
		var bestAddr []byte
		bestScore := 0

		v := big.NewInt(27)
		r := big.NewInt(0x539)
		suffixLen := len(outputSuffix)

		for i := 0; i < maxRounds; i++ {
			nonce := new(big.Int).Set(inputNonce)
			nonce = nonce.Add(nonce, big.NewInt(int64(i)))
			nonce = nonce.Xor(nonce, preimage)

			sender, err := recoverPlain(inputHash, r, nonce, v)
			if err != nil {
				panic(err)
			}
			addr := getCreateAddr(sender[:])

			score := 0
			for i := 0; i < suffixLen; i++ {
				addrpos := 20 - suffixLen + i

				// max 16 points per nibble match
				highDiff := uint8(addr[addrpos]>>4) - uint8(outputSuffix[i]>>4)
				highValue := 15 - highDiff

				lowDiff := uint8(addr[addrpos]&0x0f) - uint8(outputSuffix[i]&0x0f)
				lowValue := 15 - lowDiff

				scoreVal := int(highValue + lowValue)

				//fmt.Printf("addrpos: %v - 0x%x/0x%x (%v)  %v + %v\n", addrpos, addr[addrpos], outputSuffix[i], factor, score, scoreVal)

				score += scoreVal
			}

			if score > bestScore {
				bestScore = score
				bestNonce = nonce
				bestAddr = addr[:]
			}
		}

		//fmt.Printf("best addr: 0x%x\n", bestAddr)

		output := fmt.Sprintf("0x%x%x", bestAddr, bestNonce.Bytes())
		return output
	})
	return jsonFunc
}

func hex2Bytes(str string) []byte {
	h, _ := hex.DecodeString(str)
	return h
}

func fromHex(s string) []byte {
	if len(s) >= 2 && s[0] == '0' && (s[1] == 'x' || s[1] == 'X') {
		s = s[2:]
	}
	if len(s)%2 == 1 {
		s = "0" + s
	}
	return hex2Bytes(s)
}

type KeccakState interface {
	hash.Hash
	Read([]byte) (int, error)
}

func keccak256(data ...[]byte) [32]byte {
	var b [32]byte
	d := sha3.NewLegacyKeccak256().(KeccakState)
	for _, b := range data {
		d.Write(b)
	}
	d.Read(b[:])
	return b
}

func getCreateAddr(deployer []byte) [20]byte {
	data := append([]byte{0xd6, 0x94}, deployer...)
	data = append(data, 0x80)
	hash := keccak256(data)
	var b [20]byte
	copy(b[:], hash[12:])
	return b
}

func recoverPlain(sighash []byte, R, S, Vb *big.Int) ([]byte, error) {
	V := byte(Vb.Uint64() - 27)

	// encode the signature in uncompressed format
	r, s := R.Bytes(), S.Bytes()
	sig := make([]byte, 65)
	copy(sig[32-len(r):32], r)
	copy(sig[64-len(s):64], s)
	sig[64] = V

	// recover the public key from the signature
	pubKey, err := sigToPub(sighash, sig)
	if err != nil {
		return nil, err
	}

	pub := pubKey.SerializeUncompressed()

	hash := keccak256(pub[1:])
	return hash[12:], nil
}

func sigToPub(hash, sig []byte) (*btcec.PublicKey, error) {
	// Convert to btcec input format with 'recovery id' v at the beginning.
	btcsig := make([]byte, 65)
	btcsig[0] = sig[64] + 27
	copy(btcsig[1:], sig)

	pub, _, err := btc_ecdsa.RecoverCompact(btcsig, hash)
	return pub, err
}
