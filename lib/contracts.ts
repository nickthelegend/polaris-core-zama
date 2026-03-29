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

export const CONTRACTS = {
    MASTER: {
        POOL_MANAGER: "0x9f40bfe80fADa11569c68d2DFb9f3250841C572E",
        LOAN_ENGINE: "0x3b3af0440510Cd99336AF525200Fd1d3F311DA24",
        SCORE_MANAGER: "0x4f8295bf1bE96b548aa0384673415217c4afed99",
        PROTOCOL_FUNDS: "0x45fDec5099580F2FeBa9E9e27FCd19BfEDDF4fA9",
        MERCHANT_ROUTER: "0xCC5B2C15D50dBE201279533a1E3fDd643F8772bb",
        CREDIT_ORACLE: "0x9260fD34Be71Fa6C8DFd7a989a0b64545FF5C0E9",
        USDC: "0x58e67DeeeCDE20f10ed90b5191f08f39e81b6658",
        ORACLE: "0x0000000000000000000000000000000000000FD2"
    },
    SPOKES: {
        SEPOLIA: {
            LIQUIDITY_VAULT: "0x5163A9689C0560DE07Cdc2ecA391BA5BE8b3D35A",
            USDC: "0xA715e84556b03aBdaC42aa421b5D6081A5434a2F",
            USDT: "0x87A0E38fF8e63AE90ea95bbd61Ce9c6EC75422d0",
            AVAX: "0x5b731C3e54b7aC7A5516861eac9704aDBC480584",
            WBTC: "0x4105F990aBd92f8CCCD8c58433963B862C4b34a5",
            WETH: "0x35504AceAea50B3dbeF640618b535feDB2db680B",
            LINK: "0x1929264FC968770A72021fE29aD5d9e4344ef152",
            BNB: "0xd376252519348D8d219C250E374CE81A1B528BE5",
            id: 11155111
        },
        FUJI: {
            LIQUIDITY_VAULT: "0xD221D9E4F6E6709a3cf38cEC57662bbC7F60f3Df",
            USDC: "0x7F7FfeC9a7a6DC8B383606BE86DE5bE9e99a1302",
            USDT: "0xDE7bB3d5d37Cc4A4eCdd0Fd10C9AF92B545C89c2",
            AVAX: "0x21B15447514649C7cb934cA01c2528ff52Daa84b",
            WBTC: "0xbCFCF4D1B880Ea38b71E45394FaCC5b71678C44A",
            WETH: "0x0a60F63B187F9BBa95F213fC7eca447239E10603",
            LINK: "0x4f8295bf1bE96b548aa0384673415217c4afed99",
            BNB: "0xE6f01d32851A30Fb8C8A02142d5d1E333574312a",
            id: 43113
        },
        BASE_SEPOLIA: {
            LIQUIDITY_VAULT: "0x546Bbb8B960EaF059B0771cC4808Da13829e1c42",
            USDC: "0xD221D9E4F6E6709a3cf38cEC57662bbC7F60f3Df",
            USDT: "0xf2411f2C27a619Ab40001A956fEd625DBFa458AF",
            AVAX: "0x369B65aaD1c39159a0f860012f59D0F4c3484812",
            WBTC: "0x5A1D3939C5b3a43B36Dc42C816bc5c0F02c1C261",
            WETH: "0x8C213a3Db9187966Ebf8DfD0488A225044265AeF",
            LINK: "0x9f40bfe80fADa11569c68d2DFb9f3250841C572E",
            BNB: "0xBa403C90a5FE4BDfD2a4705bA7C2fA30F47Aa2e1",
            id: 84532
        },
        CRONOS: {
            LIQUIDITY_VAULT: "0x2D048c09ff1d00F2c948Fe359f6437b2aCc3C00B",
            USDC: "0xD81FB2ea7fA64E3CC934eC7245566F4178A949E9",
            USDT: "0x97658341fc30EEBe61a62d65FA62743A5FE286fC",
            AVAX: "0xb0764B66447E3BFFB331660765Fe0101b2337963",
            WBTC: "0x466Bd36643148093e10e9615C36EeB97c5c99c3C",
            WETH: "0x2eaBA0B5582ca017EbF7Eb6305B7F72C807CFDa8",
            LINK: "0x78300a1F2EA8FA8E0Cb202610E639A54A829237b",
            BNB: "0x136a2956e38ae617F4be249b383191A55f274431",
            id: 338
        },
        GANACHE: {
            LIQUIDITY_VAULT: "0xc4a748342b13F900c3691125A3D8019d36803c07",
            USDC: "0x294C0Ad33d01C27B9Aaf6d954Bb211416A06EB03",
            USDT: "0x4248759651CBBfBE5331325730b92d791C1bB8a1",
            POOL_MANAGER: "0xa196C48B229a026a6F55d2ece742276092F4Bc32",
            CREDIT_ORACLE: "0x9260fD34Be71Fa6C8DFd7a989a0b64545FF5C0E9",
            SCORE_MANAGER: "0xC1b3409Fb0c93Fed4A6cE046557cBE042d5A40Dc",
            LOAN_ENGINE: "0xe9f47f5f0D1A5bd5BfeCf46c48E72206fD7E4e82",
            MERCHANT_ROUTER: "0xCC5B2C15D50dBE201279533a1E3fDd643F8772bb",
            id: 1337
        }
    },
    SOURCE: {
        LIQUIDITY_VAULT: "0x8C213a3Db9187966Ebf8DfD0488A225044265AeF",
        USDC: "0xbCFCF4D1B880Ea38b71E45394FaCC5b71678C44A",
        USDT: "0xf75C8eE5b4a005120bCF0D6d457A8000dddDea8f"
    },
    // FHE Private Lending contracts (deployed on Sepolia / local Hardhat).
    // Update these addresses after running `npx hardhat run scripts/deploy-private-lending.js`.
    PRIVATE_LENDING: {
        PRIVATE_COLLATERAL_VAULT: "0x0000000000000000000000000000000000000000",
        PRIVATE_BORROW_MANAGER: "0x0000000000000000000000000000000000000000",
        PRIVATE_LENDING_POOL: "0x0000000000000000000000000000000000000000",
        PRIVATE_LIQUIDATION_ENGINE: "0x0000000000000000000000000000000000000000"
    },
    // FHE Private Lending contracts deployed to a local Hardhat node (chainId 31337).
    // Run `npm run deploy:local` in polaris-protocol, then copy the addresses from
    // polaris-protocol/deployments-local-hardhat.json into the fields below.
    LOCAL_HARDHAT: {
        PRIVATE_COLLATERAL_VAULT: "0x0000000000000000000000000000000000000000",
        PRIVATE_BORROW_MANAGER: "0x0000000000000000000000000000000000000000",
        PRIVATE_LENDING_POOL: "0x0000000000000000000000000000000000000000",
        PRIVATE_LIQUIDATION_ENGINE: "0x0000000000000000000000000000000000000000"
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
    PrivateLiquidationEngine: PrivateLiquidationEngineABI
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
    }
};
