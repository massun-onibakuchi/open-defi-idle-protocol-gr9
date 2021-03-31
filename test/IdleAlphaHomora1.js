const { ethers, waffle } = require("hardhat");
const hre = require("hardhat");
const chai = require("chai");
const { expect } = require("chai");
const { BigNumber } = ethers;
const toWei = ethers.utils.parseEther;

chai.use(require("chai-bignumber")());

// alpha homora v1 bank
const BANK_ADDRESS = "0x67B66C99D3Eb37Fa76Aa3Ed1ff33E8e39F0b9c7A";
const IDLE_TOKEN_ADDRESS = "0x875773784Af8135eA0ef43b5a374AaD105c5D39e";
const SECS_OF_THE_YEAR = 3600 * 24 * 365;
const EXP_SCALE = BigNumber.from("10").pow("18");

describe("IdleAlphaHomora", async function () {
    const provider = waffle.provider;
    const [wallet, other] = provider.getWallets();
    console.log("wallet.address :>> ", wallet.address);
    console.log("other.address :>> ", other.address);

    let weth;
    let bank;
    let bankWrapper;
    let bankInterestConfig;
    let idleToken;
    before(async function () {
        bank = await ethers.getVerifiedContractAt(BANK_ADDRESS);
        // idleToken = await ethers.getVerifiedContractAt(IDLE_TOKEN_ADDRESS);
        // const configAddress = await bank.config();
        // bankInterestConfig = await ethers.getVerifiedContractAt(configAddress);
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
        expect(await bankWrapper.idleToken()).to.eq(IDLE_TOKEN_ADDRESS);
    });

    function supplyRateWithParams(params) {
        const toSupplier = EXP_SCALE.sub(params[2]);
        const ratePerSec = params[3].mul(toSupplier);
        const utilizationRate = params[0].mul(EXP_SCALE).div(params[1].add(params[4]));
        return utilizationRate.mul(ratePerSec).mul(BigNumber.from(SECS_OF_THE_YEAR)).div(EXP_SCALE);
    }

    it("return next supply rate given amount 0", async function () {
        const params = [];
        params[0] = BigNumber.from("124978017723411850744855"); // bank.glbDebtVal()
        // todo おそらく前者が正しいかもだが，solファイルの方でutilizationの計算の丸め込みのミスをしていたのでそこの見直し
        params[1] = BigNumber.from("155700305727622899758175"); // bank.totalETH();
        // params[1] = BigNumber.from("31539345857040984629574"); // address(bank).balance;
        params[2] = BigNumber.from("1000"); // await bankInterestConfig.getReservePoolBps();
        params[3] = BigNumber.from("3165005828"); // await bankInterestConfig.getInterestRate(params[0],params[1]);
        params[4] = BigNumber.from("0");
        // utilizationRate = 0.80*100
        // supplyRate = 0.717
        const expectedRes = supplyRateWithParams(params);
        const res = await bankWrapper.nextSupplyRateWithParams(params);
        console.log('utilizationRate :>> ', params[0].mul(BigNumber.from(100)).div(params[1].add(params[4])).toString());
        console.log('res.div(EXP_SCALE).toString() :>> ', res.div(EXP_SCALE).toString());
        console.log('expectedRes.div(EXP_SCALE).toString() :>> ', expectedRes.div(EXP_SCALE).toString());
        expect(res).to.be.bignumber.eq(expectedRes);
        // res.should.be.bignumber.to.eq(expectedRes);
    });

    // it('getAPR returns current yearly rate', async function () {
    //   const res = await bankWrapper.getAPR();
    //   const expectedRes = await bankWrapper.nextSupplyRate(0);
    //   // const expectedRes = rate.mul(BigNumber.from(SECS_OF_THE_YEAR));
    //   res.should.not.be.bignumber.equal(BigNumber.from('0'));
    //   res.should.be.bignumber.equal(expectedRes);
    // });

    // it('return next supply rate given amount',async function(){
    //   const params = [];
    //   //  utilizationRate = params[0] / params[1].add(params[4])
    //   params[0] = BigNumber.from("124978017723411850744855"); // bank.glbDebtVal()
    //   params[1] = toWei("31539.345857040984629"); // provider.getBalance(bank.address);
    //   params[2] = toWei(1000); // await bankInterestConfig.getReservePoolBps();
    //   params[3] = BigNumber.from("3165005828");  // await bankInterestConfig.getInterestRate(params[0],params[1]);
    //   params[4] = toWei(1);
    //   const expectedRes = supplyRateWithParams(params);
    //   (await bank.nextSupplyRateWithParams(params)).should.be.bignumber.eq(expectedRes);
    // });
});

// contract('IdleCompoundETH', function ([_, creator, nonOwner, someone, foo]) {
//   beforeEach(async function () {
//     this.one = new BN('1000000000000000000');
//     this.oneCToken = new BN('100000000'); // 8 decimals
//     this.ETHAddr = '0x0000000000000000000000000000000000000000';
//     this.someAddr = '0x0000000000000000000000000000000000000001';
//     this.someOtherAddr = '0x0000000000000000000000000000000000000002';

//     this.WETHMock = await WETHMock.new({from: creator});
//     await this.WETHMock.deposit({from: creator, value: this.one.mul(BNify('2'))})
//     this.WhitePaperMock = await WhitePaperMock.new({from: creator});
//     this.cWETHMock = await cWETHMock.new(this.WETHMock.address, creator, this.WhitePaperMock.address, {from: creator});
//     this.cWETHWrapper = await IdleCompoundETH.new(
//       this.cWETHMock.address,
//       this.WETHMock.address,
//       nonOwner,
//       {from: creator}
//     );
//   });

//   it('constructor set a token address', async function () {
//     (await this.cWETHWrapper.token()).should.equal(this.cWETHMock.address);
//   });
//   it('allows onlyOwner to setBlocksPerYear', async function () {
//     const val = BNify('2425846');
//     // it will revert with reason `idleToken addr already set` because it has already been set in beforeEach
//     await this.cWETHWrapper.setBlocksPerYear(val, { from: creator });
//     (await this.cWETHWrapper.blocksPerYear()).should.be.bignumber.equal(val);

//     // it will revert with unspecified reason for nonOwner
//     await expectRevert.unspecified(this.cWETHWrapper.setBlocksPerYear(val, { from: nonOwner }));
//   });
//   it('returns next supply rate given amount', async function () {
//     const val = [];
//     val[0] = BNify('1000000000000000000'), // 10 ** 18;
//     val[1] = BNify('50000000000000000'), // white.baseRate();
//     val[2] = BNify('23235999897534012338929659'), // cToken.totalBorrows();
//     val[3] = BNify('120000000000000000'), // white.multiplier();
//     val[4] = BNify('107742405685625342683992'), // cToken.totalReserves();
//     val[5] = BNify('950000000000000000'), // j.sub(cToken.reserveFactorMantissa());
//     val[6] = BNify('11945633145364637018215366'), // cToken.getCash();
//     val[7] = BNify('2371428'), // cToken.blocksPerYear();
//     val[8] = BNify('100'), // 100;
//     val[9] = BNify('10000000000000000000000') // 10**22 -> 10000 DAI newAmountSupplied;

//     // set mock data in cWETHMock
//     await this.cWETHMock.setParams(val);

//     const nextSupplyInterestRateCompound = await this.cWETHWrapper.nextSupplyRate.call(val[9]);

//     // rename params for compound formula
//     const j = val[0]; // 10 ** 18;
//     const a = val[1]; // white.baseRate(); // from WhitePaper
//     const b = val[2]; // cToken.totalBorrows();
//     const c = val[3]; // white.multiplier(); // from WhitePaper
//     const d = val[4]; // cToken.totalReserves();
//     const e = val[5]; // j.sub(cToken.reserveFactorMantissa());
//     const s = val[6]; // cToken.getCash();
//     const k = val[7]; // cToken.blocksPerYear();
//     const f = val[8]; // 100;
//     const x = val[9]; // newAmountSupplied;

//     // q = ((((a + (b*c)/(b + s + x)) / k) * e * b / (s + x + b - d)) / j) * k * f -> to get yearly rate
//     const expectedRes = a.add(b.mul(c).div(b.add(s).add(x))).div(k).mul(e).mul(b).div(
//       s.add(x).add(b).sub(d)
//     ).div(j).mul(k).mul(f); // to get the yearly rate

//     nextSupplyInterestRateCompound.should.not.be.bignumber.equal(BNify('0'));
//     nextSupplyInterestRateCompound.should.be.bignumber.equal(expectedRes);
//   });
//   // it('returns next supply rate given params (counting fee)', async function () {
//   //   // tested with data and formula from task idleDAI:rebalanceCalc -> targetSupplyRateWithFeeCompound
//   //   const val = [];
//   //   val[0] = BNify('1000000000000000000'), // 10 ** 18;
//   //   val[1] = BNify('50000000000000000'), // white.baseRate();
//   //   val[2] = BNify('23235999897534012338929659'), // cToken.totalBorrows();
//   //   val[3] = BNify('120000000000000000'), // white.multiplier();
//   //   val[4] = BNify('107742405685625342683992'), // cToken.totalReserves();
//   //   val[5] = BNify('950000000000000000'), // j.sub(cToken.reserveFactorMantissa());
//   //   val[6] = BNify('11945633145364637018215366'), // cToken.getCash();
//   //   val[7] = BNify('2102400'), // cToken.blocksPerYear();
//   //   val[8] = BNify('100'), // 100;
//   //   val[9] = BNify('10000000000000000000000') // 10**22 -> 10000 DAI newAmountSupplied;

//   //   const res = await this.cWETHWrapper.nextSupplyRateWithParams.call(val, { from: nonOwner });

//   //   const j = val[0]; // 10 ** 18;
//   //   const a = val[1]; // white.baseRate(); // from WhitePaper
//   //   const b = val[2]; // cToken.totalBorrows();
//   //   const c = val[3]; // white.multiplier(); // from WhitePaper
//   //   const d = val[4]; // cToken.totalReserves();
//   //   const e = val[5]; // j.sub(cToken.reserveFactorMantissa());
//   //   const s = val[6]; // cToken.getCash();
//   //   const k = val[7]; // cToken.blocksPerYear();
//   //   const f = val[8]; // 100;
//   //   const x = val[9]; // newAmountSupplied;

//   //   // q = ((((a + (b*c)/(b + s + x)) / k) * e * b / (s + x + b - d)) / j) * k * f -> to get yearly rate
//   //   const expectedRes = a.add(b.mul(c).div(b.add(s).add(x))).div(k).mul(e).mul(b).div(
//   //     s.add(x).add(b).sub(d)
//   //   ).div(j).mul(k).mul(f); // to get the yearly rate

//   //   res.should.not.be.bignumber.equal(BNify('0'));
//   //   res.should.be.bignumber.equal(expectedRes);
//   // });
//   // it('getPriceInToken returns cToken price', async function () {
//   //   const res = await this.cWETHWrapper.getPriceInToken.call({ from: nonOwner });
//   //   const expectedRes = BNify(await this.cWETHMock.exchangeRateStored.call());
//   //   res.should.be.bignumber.equal(expectedRes);
//   //   res.should.be.bignumber.equal('200000000000000000000000000');
//   // });
//   // it('getAPR returns current yearly rate (counting fee)', async function () {
//   //   const res = await this.cWETHWrapper.getAPR.call({ from: nonOwner });

//   //   const rate = await this.cWETHMock.supplyRatePerBlock.call();
//   //   const blocksPerYear = 2371428;
//   //   const expectedRes = BNify(rate).mul(BNify(blocksPerYear)).mul(BNify('100'));
//   //   res.should.not.be.bignumber.equal(BNify('0'));
//   //   res.should.be.bignumber.equal(expectedRes);
//   // });
//   // it('mint returns 0 if no tokens are present in this contract', async function () {
//   //   const res = await this.cWETHWrapper.mint.call({ from: nonOwner });
//   //   res.should.be.bignumber.equal(BNify('0'));
//   // });
//   // it('mint creates cTokens and it sends them to msg.sender', async function () {
//   //   // deposit 1 WETH in cWETHWrapper
//   //   await this.WETHMock.transfer(this.cWETHWrapper.address, BNify('1').mul(this.one), {from: creator});
//   //   // mints in Compound with 1 ETH
//   //   const callRes = await this.cWETHWrapper.mint.call({ from: nonOwner });
//   //   // check return value
//   //   BNify(callRes).should.be.bignumber.equal(BNify('5000000000'));
//   //   // do the effective tx
//   //   await this.cWETHWrapper.mint({ from: nonOwner });
//   //   (await this.cWETHMock.balanceOf(nonOwner)).should.be.bignumber.equal(BNify('5000000000'));
//   // });
//   // it('redeem creates cTokens and it sends them to msg.sender', async function () {
//   //   await web3.eth.sendTransaction({from: creator, value: this.one.mul(BNify('2')), to: this.cWETHMock.address});
//   //   // deposit 5000 cDAI in cWETHWrapper
//   //   await this.cWETHMock.transfer(this.cWETHWrapper.address, BNify('50').mul(this.oneCToken), {from: creator});
//   //   // redeem in Compound with 50 cDAI * 0.02 (price) = 1 ETH
//   //   const callRes = await this.cWETHWrapper.redeem.call(nonOwner, { from: nonOwner });
//   //   // check return value
//   //   BNify(callRes).should.be.bignumber.equal(BNify('1').mul(this.one));
//   //   // do the effective tx
//   //   await this.cWETHWrapper.redeem(nonOwner, { from: nonOwner });
//   //   (await this.WETHMock.balanceOf(nonOwner)).should.be.bignumber.equal(BNify('1').mul(this.one));
//   // });
// });
