import {Wallet} from "@ethersproject/wallet";
import {JsonRpcProvider} from "@ethersproject/providers";
import {RealitioV21ArbitratorWithAppeals__factory, RealityETHV30__factory} from "./typechain";

function getWallet(privateKey: string) {
    return new Wallet(privateKey, new JsonRpcProvider(process.env.WEB3_PROVIDER_URL));
}

function getRealitioArbitrator(arbitratorAddress: string, privateKey: string) {
    return RealitioV21ArbitratorWithAppeals__factory.connect(arbitratorAddress, getWallet(privateKey));
}

function getRealityETHV30(realitioAddress: string, privateKey: string) {
    return RealityETHV30__factory.connect(realitioAddress, getWallet(privateKey));
}

export {getRealitioArbitrator, getRealityETHV30}