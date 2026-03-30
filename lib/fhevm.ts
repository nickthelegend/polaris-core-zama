import { type Address, toHex } from "viem"

// Lazy-loaded singleton — avoids WASM init on every page
let instancePromise: Promise<any> | null = null

/**
 * Initializes and returns the Zama FHEVM instance.
 * Derives pattern from sibling project (BlindPool).
 */
export async function getZamaInstance() {
  if (!instancePromise) {
    instancePromise = (async () => {
      console.log("[FHEVM] Importing relayer-sdk/web...")
      const { createInstance, SepoliaConfig, initSDK } = await import("@zama-fhe/relayer-sdk/web")
      
      console.log("[FHEVM] Initializing WASM (initSDK)...")
      await initSDK()
      
      console.log("[FHEVM] WASM ready, creating instance...")
      // Using public Sepolia RPC as fallback, ideally should come from config
      const instance = await createInstance({ 
        ...SepoliaConfig, 
        network: "https://ethereum-sepolia-rpc.publicnode.com" 
      })
      
      console.log("[FHEVM] Instance created successfully")
      return instance
    })()
  }
  return instancePromise
}

/**
 * Encrypts a 64-bit value for a specific contract.
 * Returns handles and inputProof for use in contract calls.
 */
export async function encrypt64(
  contractAddress: Address,
  userAddress: Address,
  value: bigint | number
): Promise<{ handles: `0x${string}`[]; inputProof: `0x${string}` }> {
  console.log("[FHEVM] encrypt64:", { contractAddress, userAddress, value: value.toString() })
  
  const instance = await getZamaInstance()
  const input = instance.createEncryptedInput(contractAddress, userAddress)
  input.add64(BigInt(value))
  
  const encrypted = await input.encrypt()
  
  const handles = encrypted.handles.map((h: Uint8Array | string) =>
    typeof h === "string" ? h as `0x${string}` : toHex(h)
  )
  
  const inputProof = typeof encrypted.inputProof === "string"
    ? encrypted.inputProof as `0x${string}`
    : toHex(encrypted.inputProof)
    
  return { handles, inputProof }
}

/**
 * Encrypts an address for a specific contract.
 */
export async function encryptAddress(
  contractAddress: Address,
  userAddress: Address,
  targetAddress: Address
): Promise<{ handles: `0x${string}`[]; inputProof: `0x${string}` }> {
  const instance = await getZamaInstance()
  const input = instance.createEncryptedInput(contractAddress, userAddress)
  input.addAddress(targetAddress)
  
  const encrypted = await input.encrypt()
  
  const handles = encrypted.handles.map((h: Uint8Array | string) =>
    typeof h === "string" ? h as `0x${string}` : toHex(h)
  )
  
  const inputProof = typeof encrypted.inputProof === "string"
    ? encrypted.inputProof as `0x${string}`
    : toHex(encrypted.inputProof)
    
  return { handles, inputProof }
}
