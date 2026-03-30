import PoolManagerABI from './abis/PoolManager.json';
import LiquidityVaultABI from './abis/LiquidityVault.json';
import CreditVaultABI from './abis/CreditVault.json';
import LoanEngineABI from './abis/LoanEngine.json';
import InsurancePoolABI from './abis/InsurancePool.json';
import MerchantRouterABI from './abis/MerchantRouter.json';
import ObolusMerchantEscrowABI from './abis/ObolusMerchantEscrow.json';
import MockERC20ABI from './abis/MockERC20.json';
import MockOracleRelayerABI from './abis/MockOracleRelayer.json';
import ScoreManagerABI from './abis/ScoreManager.json';
import ProtocolFundsABI from './abis/ProtocolFunds.json';
import CreditOracleABI from './abis/CreditOracle.json';
import PrivateCollateralVaultABI from './abis/PrivateCollateralVault.json';
import PrivateBorrowManagerABI from './abis/PrivateBorrowManager.json';
import PrivateLendingPoolABI from './abis/PrivateLendingPool.json';
import PrivateLiquidationEngineABI from './abis/PrivateLiquidationEngine.json';
import PrivateSwapUSDCABI from './abis/PrivateSwapUSDC.json';
import PrivateSwapUSDTABI from './abis/PrivateSwapUSDT.json';
import PrivateSwapWETHABI from './abis/PrivateSwapWETH.json';
import PrivateSwapBNBABI from './abis/PrivateSwapBNB.json';

export const CONTRACTS = {
    MASTER: {
        POOL_MANAGER: process.env.VITE_POOL_MANAGER || "",
        LOAN_ENGINE: process.env.VITE_LOAN_ENGINE || "",
        SCORE_MANAGER: process.env.VITE_SCORE_MANAGER || "",
        PROTOCOL_FUNDS: process.env.VITE_PROTOCOL_FUNDS || "",
        MERCHANT_ROUTER: process.env.VITE_MERCHANT_ROUTER || "",
        CREDIT_ORACLE: process.env.VITE_CREDIT_ORACLE || "",
        USDC: process.env.VITE_MOCK_USDC || "",
        TOKEN_FAUCET: process.env.VITE_TOKEN_FAUCET || "",
        ORACLE: "0x0000000000000000000000000000000000000FD2"
    },
    SPOKES: {
        SEPOLIA: {
            LIQUIDITY_VAULT: process.env.VITE_POOL_MANAGER || "", // In this archi, PoolManager acts as vault hub
            USDC: process.env.VITE_MOCK_USDC || "",
            USDT: process.env.VITE_MOCK_USDT || "",
            AVAX: "", 
            WBTC: "",
            WETH: process.env.VITE_MOCK_WETH || "",
            LINK: "",
            BNB: process.env.VITE_MOCK_BNB || "",
            PRIVATE_SWAPS: {
                WETH: process.env.VITE_PRIVATE_SWAP_WETH || "",
                BNB: process.env.VITE_PRIVATE_SWAP_BNB || "",
                USDC: process.env.VITE_PRIVATE_SWAP_USDC || "",
                USDT: process.env.VITE_PRIVATE_SWAP_USDT || ""
            },
            PRIVATE_LENDING: {
                PRIVATE_LENDING_POOL: process.env.VITE_PRIVATE_LENDING_POOL || "",
                PRIVATE_BORROW_MANAGER: process.env.VITE_PRIVATE_BORROW_MANAGER || "",
                PRIVATE_COLLATERAL_VAULT: process.env.VITE_PRIVATE_COLLATERAL_VAULT || ""
            },
            id: 11155111
        },
        // Keeping structure for other chains but leaving empty/placeholders if not in .env
        FUJI: { id: 43113, LIQUIDITY_VAULT: "", USDC: "", USDT: "", AVAX: "", WBTC: "", WETH: "", LINK: "", BNB: "" },
        BASE_SEPOLIA: { id: 84532, LIQUIDITY_VAULT: "", USDC: "", USDT: "", AVAX: "", WBTC: "", WETH: "", LINK: "", BNB: "" },
        CRONOS: { id: 338, LIQUIDITY_VAULT: "", USDC: "", USDT: "", AVAX: "", WBTC: "", WETH: "", LINK: "", BNB: "" },
        GANACHE: { 
            id: 1337,
            LIQUIDITY_VAULT: "",
            USDC: "",
            USDT: "",
            POOL_MANAGER: "",
            CREDIT_ORACLE: "",
            SCORE_MANAGER: "",
            LOAN_ENGINE: "",
            MERCHANT_ROUTER: ""
        }
    },
    SOURCE: {
        LIQUIDITY_VAULT: process.env.VITE_POOL_MANAGER || "",
        USDC: process.env.VITE_MOCK_USDC || "",
        USDT: process.env.VITE_MOCK_USDT || ""
    },
    PRIVATE_LENDING: {
        PRIVATE_COLLATERAL_VAULT: process.env.VITE_PRIVATE_COLLATERAL_VAULT || "",
        PRIVATE_BORROW_MANAGER: process.env.VITE_PRIVATE_BORROW_MANAGER || "",
        PRIVATE_LENDING_POOL: process.env.VITE_PRIVATE_LENDING_POOL || "",
        PRIVATE_LIQUIDATION_ENGINE: process.env.VITE_PRIVATE_LIQUIDATION_ENGINE || ""
    },
    LOCAL_HARDHAT: {
        PRIVATE_COLLATERAL_VAULT: process.env.VITE_PRIVATE_COLLATERAL_VAULT || "",
        PRIVATE_BORROW_MANAGER: process.env.VITE_PRIVATE_BORROW_MANAGER || "",
        PRIVATE_LENDING_POOL: process.env.VITE_PRIVATE_LENDING_POOL || "",
        PRIVATE_LIQUIDATION_ENGINE: process.env.VITE_PRIVATE_LIQUIDATION_ENGINE || ""
    },
    MOCK_TOKENS: {
        LOCALHOST: {
            WETH: process.env.VITE_MOCK_WETH || "",
            USDC: process.env.VITE_MOCK_USDC || "",
            WBTC: "",
            BNB:  process.env.VITE_MOCK_BNB || ""
        }
    }
};


export const ABIS = {
    PoolManager: PoolManagerABI,
    LiquidityVault: LiquidityVaultABI,
    CreditVault: CreditVaultABI,
    LoanEngine: LoanEngineABI,
    InsurancePool: InsurancePoolABI,
    MerchantRouter: MerchantRouterABI,
    ObolusMerchantEscrow: ObolusMerchantEscrowABI,
    MockERC20: MockERC20ABI,
    MockOracleRelayer: MockOracleRelayerABI,
    ScoreManager: ScoreManagerABI,
    ProtocolFunds: ProtocolFundsABI,
    CreditOracle: CreditOracleABI,
    PrivateCollateralVault: PrivateCollateralVaultABI,
    PrivateBorrowManager: PrivateBorrowManagerABI,
    PrivateLendingPool: PrivateLendingPoolABI,
    PrivateLiquidationEngine: PrivateLiquidationEngineABI,
    PrivateSwapUSDC: PrivateSwapUSDCABI,
    PrivateSwapUSDT: PrivateSwapUSDTABI,
    PrivateSwapWETH: PrivateSwapWETHABI,
    PrivateSwapBNB: PrivateSwapBNBABI
};

export const NETWORKS = {
    USC: {
        id: 102036,
        name: "USC Hub V2",
        rpc: "https://rpc.usc-testnet2.creditcoin.network",
        explorer: "https://explorer.usc-testnet2.creditcoin.network",
        icon: "creditcoin"
    },
    SEPOLIA: {
        id: 11155111,
        name: "Eth Sepolia",
        rpc: "https://1rpc.io/sepolia",
        explorer: "https://sepolia.etherscan.io",
        icon: "ethereum"
    },
    FUJI: {
        id: 43113,
        name: "Avalanche Fuji",
        rpc: "https://api.avax-test.network/ext/bc/C/rpc",
        explorer: "https://testnet.snowtrace.io",
        icon: "avalanche"
    },
    BASE_SEPOLIA: {
        id: 84532,
        name: "Base Sepolia",
        rpc: "https://base-sepolia.api.onfinality.io/public",
        explorer: "https://sepolia.basescan.org",
        icon: "base"
    },
    CRONOS: {
        id: 338,
        name: "Cronos Testnet",
        rpc: "https://evm-t3.cronos.org",
        explorer: "https://explorer.cronos.org/testnet",
        icon: "ethereum"
    },
    MONAD: {
        id: 20143,
        name: "Monad Testnet",
        rpc: "https://testnet-rpc.monad.xyz/",
        explorer: "https://testnet.monadexplorer.com",
        icon: "ethereum"
    },
    GANACHE: {
        id: 1337,
        name: "Localnet",
        rpc: "http://127.0.0.1:7545",
        explorer: "",
        icon: "ethereum"
    },
    LOCAL_HARDHAT: {
        id: 31337,
        name: "Hardhat Local",
        rpc: "http://127.0.0.1:8545",
        explorer: "",
        icon: "ethereum"
    }
};
