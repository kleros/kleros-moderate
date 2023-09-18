import {Wallet} from "@ethersproject/wallet";
import {JsonRpcProvider} from "@ethersproject/providers";
import {RealitioV21ArbitratorWithAppeals__factory, RealityETHV30__factory, ModerateBilling__factory} from "./typechain";

function getWallet(privateKey: string) {
    return new Wallet(privateKey, new JsonRpcProvider(process.env.WEB3_PROVIDER_URL));
}

function getWalletRPC(privateKey: string, rpc: JsonRpcProvider) {
    return new Wallet(privateKey, rpc);
  }

function getRealitioArbitrator(arbitratorAddress: string, privateKey: string) {
    return RealitioV21ArbitratorWithAppeals__factory.connect(arbitratorAddress, getWallet(privateKey));
}

function getRealityETHV30(realitioAddress: string, privateKey: string) {
    return RealityETHV30__factory.connect(realitioAddress, getWallet(privateKey));
}

function getRealitioArbitratorProvider(arbitratorAddress: string, privateKey: string, rpc: JsonRpcProvider) {
    return RealitioV21ArbitratorWithAppeals__factory.connect(arbitratorAddress, getWalletRPC(privateKey, rpc));
}

function getRealityETHV30Provider(realitioAddress: string, privateKey: string, rpc: JsonRpcProvider) {
    return RealityETHV30__factory.connect(realitioAddress, getWalletRPC(privateKey, rpc));
}

function getModerateBilling(moderateBillingAddress: string, privateKey: string) {
    return RealityETHV30__factory.connect(moderateBillingAddress, getWallet(privateKey));
}

export {
    getRealitioArbitrator, 
    getRealitioArbitratorProvider,
    getRealityETHV30,
    getRealityETHV30Provider,
    getModerateBilling
}