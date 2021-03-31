const hre = require("hardhat");
const { ethers, waffle } = require("hardhat");
const { expect, assert } = require("chai");
const { BigNumber } = ethers;
const toWei = ethers.utils.parseEther;

// alpha homora v1 bank
const BANK_ADDRESS = "0x67B66C99D3Eb37Fa76Aa3Ed1ff33E8e39F0b9c7A";
const IDLE_TOKEN_ADDRESS = "0x5274891bec421b39d23760c04a6755ecb444797c";
const SECS_OF_THE_YEAR = 3600 * 24 * 365; //31536000
const EXP_SCALE = BigNumber.from("10").pow("18");

describe("IdleAlphaHomora", async function () {
    const provider = waffle.provider;
    const [wallet, other] = provider.getWallets();
    const idleToken = await ethers.getSigner(IDLE_TOKEN_ADDRESS);
    console.log("wallet.address :>> ", wallet.address);
    console.log("other.address :>> ", other.address);

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
        bankWrapper = await BankWrapper.deploy(bank.address, weth.address, IDLE_TOKEN_ADDRESS);
    });

    it("constructor set a token address", async function () {
        expect(await bankWrapper.token()).to.eq(bank.address);
    });
    it("constructor set an underlying address", async function () {
        expect(await bankWrapper.underlying()).to.eq(weth.address);
    });
    it("constructor set an idleToken address", async function () {
        const idleToken = await ethers.getSigner(IDLE_TOKEN_ADDRESS);
        expect(await bankWrapper.idleToken()).to.eq(idleToken.address);
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
        assert.isTrue(res.eq(expectedRes), "not equal");
        // expect(res).to.be.bignumber.eq(expectedRes);
    });

    it("getAPR returns current yearly rate", async function () {
        const res = await bankWrapper.getAPR();
        const expectedRes = await bankWrapper.nextSupplyRate(0);
        assert.isTrue(res.eq(expectedRes), "not equal");
    });

    it("return next supply rate given amount", async function () {
        const params = [];
        params[0] = BigNumber.from("124978017723411850744855"); //  debt
        params[1] = BigNumber.from("31539345857040984629574"); //  bank's ETH balance
        params[2] = BigNumber.from("1000"); // reserveRateBps
        params[3] = BigNumber.from("3165005828"); // borrow interest
        params[4] = BigNumber.from("100"); // newAmount
        const expectedRes = supplyRateWithParams(params);
        const res = await bankWrapper.nextSupplyRateWithParams(params);
        assert.isTrue(res.eq(expectedRes), "not equal");
    });

    it("getPriceInToken returns cToken price", async function () {
        const res = await bankWrapper.getPriceInToken();
        expect(res) > EXP_SCALE;
    });

    it("mint returns 0 if no tokens are present in this contract", async function () {
        const res = await bankWrapper.connect(idleToken).mint();
        assert(res.eq(BigNumber.from("0")), "return none 0 value");
    });

    it("mint creates ibETH and it sends them to msg.sender", async function () {
        // deposit 1 WETH in bankWrapper
        await weth.transfer(bankWrapper.address, BigNumber.from("1"));
        // mints in bank with 1 ETH
        const expectedBalance = await bankWrapper.connect(idleToken).mint();
        // do the effective tx
        await bankWrapper.connect(idleToken).mint();

        expect(await bank.balanceOf(idleToken.address)) == expectedBalance;
    });
    // it("redeem creates ibETH and it sends them to msg.sender", async function () {
    //     await web3.eth.sendTransaction({ from: creator, value: this.one.mul(BigNumber.from("2")), to: bank.address });
    //     // deposit 5000 cDAI in bankWrapper
    //     await this.cWETHMock.transfer(bankWrapper.address, BigNumber.from("50").mul(this.oneCToken), { from: creator });
    //     // redeem in bank with 50 cDAI * 0.02 (price) = 1 ETH
    //     const res = await bankWrapper.redeem.call(nonOwner, { from: nonOwner });
    //     // check return value
    //     BigNumber.from(res).should.be.bignumber.equal(BigNumber.from("1").mul(this.one));
    //     // do the effective tx
    //     await this.cWETHWrapper.redeem(nonOwner, { from: nonOwner });
    //     (await weth.balanceOf(nonOwner)).should.be.bignumber.equal(BigNumber.from("1").mul(this.one));
    // });
});
