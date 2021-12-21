import {Wallet} from "@ethersproject/wallet";
import {JsonRpcProvider} from "@ethersproject/providers";
import {RealitioV21ArbitratorWithAppeals__factory, RealityETHV30__factory} from "./typechain";

function getWallet() {
    return new Wallet(process.env.WALLET_PRIVATE_KEY, new JsonRpcProvider(process.env.WEB3_PROVIDER_URL));
}

function getRealitioArbitrator(arbitratorAddress: string) {
    return RealitioV21ArbitratorWithAppeals__factory.connect(arbitratorAddress, getWallet());
}

function getRealityETHV30(realitioAddress: string) {
    return RealityETHV30__factory.connect(realitioAddress, getWallet());
}

export {getRealitioArbitrator, getRealityETHV30}