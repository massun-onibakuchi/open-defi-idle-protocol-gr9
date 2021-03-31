const { ethers, waffle } = require("hardhat");
const { expect, assert, use } = require("chai");
const { BigNumber } = ethers;
const toWei = ethers.utils.parseEther;

use(require("chai-bignumber")());

// alpha homora v1 bank
const BANK_ADDRESS = "0x67B66C99D3Eb37Fa76Aa3Ed1ff33E8e39F0b9c7A";
const IDLE_TOKEN_ADDRESS = "0x5274891bec421b39d23760c04a6755ecb444797c";
const SECS_OF_THE_YEAR = 3600 * 24 * 365; //31536000
const EXP_SCALE = BigNumber.from("10").pow("18");

describe("IdleAlphaHomora", async function () {
    const provider = waffle.provider;
    const [wallet, excuter] = provider.getWallets();
    console.log("wallet.address :>> ", wallet.address);
    console.log("excuter.address :>> ", excuter.address);

    let weth;
    let bank;
    let bankWrapper;
    before(async function () {
        bank = await ethers.getVerifiedContractAt(BANK_ADDRESS);
    });
    beforeEach(async function () {
        const WETH = await ethers.getContractFactory("WETH9");
        weth = await WETH.deploy();
        const BankWrapper = await ethers.getContractFactory("IdleAlphaHomora");
        bankWrapper = await BankWrapper.deploy(bank.address, weth.address, excuter.address);
    });

    it("constructor set a token address", async function () {
        expect(await bankWrapper.token()).to.eq(bank.address);
    });
    it("constructor set an underlying address", async function () {
        expect(await bankWrapper.underlying()).to.eq(weth.address);
    });
    it("constructor set an idleToken address", async function () {
        expect(await bankWrapper.idleToken()).to.eq(excuter.address);
    });

    function supplyRateWithParams(params) {
        const toSupplier = EXP_SCALE.sub(params[2]);
        const ratePerSec = params[3].mul(toSupplier);
        const total = params[1].add(params[0]).add(params[4]);
        const utilizationRate = params[0].mul(EXP_SCALE).div(total);
        return utilizationRate.mul(ratePerSec).mul(BigNumber.from(SECS_OF_THE_YEAR)).div(EXP_SCALE);
    }

    it("return next supply rate given amount 0", async function () {
        const params = [];
        params[0] = BigNumber.from("124978017723411850744855"); //  debt
        params[1] = BigNumber.from("31539345857040984629574"); //  bank's ETH balance
        params[2] = BigNumber.from("1000"); // reserveRateBps
        params[3] = BigNumber.from("3165005828"); // borrow interest
        params[4] = BigNumber.from("0"); // newAmount
        // utilization rate = 0.79
        // expected supply rate = 0.8
        const expectedRes = supplyRateWithParams(params);
        const res = await bankWrapper.nextSupplyRateWithParams(params);
        expect(res).to.eq(expectedRes);
    });

    it("getAPR returns current yearly rate", async function () {
        const res = await bankWrapper.getAPR();
        const expectedRes = await bankWrapper.nextSupplyRate(0);
        expect(res).to.equal(expectedRes);
    });

    it("return next supply rate given amount", async function () {
        const params = [];
        params[0] = BigNumber.from("124978017723411850744855"); //  debt
        params[1] = BigNumber.from("31539345857040984629574"); //  bank's ETH balance
        params[2] = BigNumber.from("1000"); // reserveRateBps
        params[3] = BigNumber.from("3165005828"); // borrow interest
        params[4] = toWei("1"); // newAmount
        const expectedRes = supplyRateWithParams(params);
        const res = await bankWrapper.nextSupplyRateWithParams(params);
        expect(res).to.equal(expectedRes);
    });

    it("getPriceInToken returns ibETH price", async function () {
        const res = await bankWrapper.getPriceInToken();
        assert.isTrue(res.gt(EXP_SCALE), "less than"); // usually greater than 1e18
    });

    it("mint returns 0 if no tokens are present in this contract", async function () {
        expect(await weth.balanceOf(bankWrapper.address)).to.equal(0);
        await bankWrapper.connect(excuter).mint();
        const ibETHAmount = await bank.balanceOf(excuter.address);
        expect(ibETHAmount).to.equal(toWei("0"));
    });

    it("mint creates ibETH and it sends them to msg.sender", async function () {
        // deposit 1 WETH in bankWrapper
        await weth.deposit({ value: toWei("1") });
        await weth.transfer(bankWrapper.address, toWei("1"));
        expect(await weth.balanceOf(bankWrapper.address)).to.equal(toWei("1"));
        // mints in bank with 1 ETH
        await bankWrapper.connect(excuter).mint();
        // do the effective tx
        await bankWrapper.connect(excuter).mint();
        const balance = await bank.balanceOf(excuter.address);
        expect(balance).not.to.equal(toWei("0"));
    });

    it("redeem ibETH and it sends them to msg.sender", async function () {
        const balanceBefore = await bank.balanceOf(excuter.address);
        await bank.connect(excuter).deposit({ value: toWei("1") });
        const balanceAfter = await bank.balanceOf(excuter.address);
        const balanceDiff = balanceAfter.sub(balanceBefore);
        expect(balanceDiff).not.equal(toWei("0"));
        console.log("balanceDiff :>> ", balanceDiff.toString());

        // transfer ibETH to bankWrapper
        await bank.connect(excuter).transfer(bankWrapper.address, balanceDiff);
        // redeem
        await bankWrapper.connect(excuter).redeem(excuter.address);
        // do the effective tx
        await bankWrapper.connect(excuter).redeem(excuter.address);

        // usually, received eth amount is greater than ibETH amount
        assert.isTrue((await weth.balanceOf(excuter.address)).gt(balanceDiff));
    });
});
