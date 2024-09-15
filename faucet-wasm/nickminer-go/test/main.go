//go:build js && wasm

package main

import (
	"encoding/hex"
	"fmt"
	"hash"
	"math/big"

	"golang.org/x/crypto/sha3"

	"github.com/btcsuite/btcd/btcec/v2"
	btc_ecdsa "github.com/btcsuite/btcd/btcec/v2/ecdsa"
)

var inputHash []byte
var outputSuffix []byte
var maxRounds int
var preimage *big.Int

func main() {
	fmt.Println("Go Web Assembly")

	v := big.NewInt(27)
	r := big.NewInt(0x539)
	s := big.NewInt(0)
	s.SetString("0x5fe7f977e71dba2ea1a68e21057b0000", 0)

	inputHash = fromHex("0x0000000000000000000000000000000000000000000000001234567890123456")

	sender, err := recoverPlain(inputHash, r, s, v)
	if err != nil {
		panic(err)
	}
	addr := getCreateAddr(sender[:])

	fmt.Printf("addr: 0x%x\n", addr)
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

	fmt.Printf("btcsig: 0x%x\n", btcsig)

	pub, _, err := btc_ecdsa.RecoverCompact(btcsig, hash)
	return pub, err
}
