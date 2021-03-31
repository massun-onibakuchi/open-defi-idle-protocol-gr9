// SPDX-License-Identifier: GPL-3.0
/**
 * @title: Alphahomora wrapper
 * @summary: Used for interacting with Alphahomora. Has
 *           a common interface with all other protocol wrappers.
 *           This contract holds assets only during a tx, after tx it should be empty
 */
pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "./interfaces/IWETH.sol";
import "./interfaces/ILendingProtocol.sol";
import "./interfaces/IBank.sol";
import "./interfaces/IBankConfig.sol";

contract IdleAlphaHomora is ILendingProtocol, Ownable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    ///@dev protocol token ibETH (bank) address
    address public override token;
    ///@dev underlying token WETH address
    address public override underlying;
    ///@dev idle token address
    address public idleToken;

    uint256 public constant SECS_OF_THE_YEAR = 3600 * 24 * 365;
    uint256 public constant EXP_SCALE = 1e18;

    /**
     * @param _token : ibETH address
     * @param _underlying : underlying token (WETH) address
     * @param _idleToken : idleToken token (WETH) address
     */
    constructor(
        address _token,
        address _underlying,
        address _idleToken
    ) {
        require(
            _token != address(0) && _underlying != address(0) && _idleToken != address(0),
            "ALPHAHOMORA: some addr is 0"
        );

        token = _token;
        underlying = _underlying;
        idleToken = _idleToken;
    }

    /**
     * Throws if called by any account other than IdleToken contract.
     */
    modifier onlyIdle() {
        require(msg.sender == idleToken, "Ownable: caller is not IdleToken");
        _;
    }

    /**
     * sets idleToken address
     * NOTE: can be called only once. It's not on the constructor because we are deploying this contract
     *       after the IdleToken contract
     * @param _idleToken : idleToken address
     */
    function setIdleToken(address _idleToken) external onlyOwner {
        require(idleToken == address(0), "idleToken addr already set");
        require(_idleToken != address(0), "_idleToken addr is 0");
        idleToken = _idleToken;
    }

    /**
     * Gets all underlying tokens in this contract and mints ibETHs
     * tokens are then transferred to msg.sender
     * NOTE: underlying tokens needs to be sended here before calling this
     *
     * @return ibETHAmount minted ibETH amount
     */
    function mint() external override onlyIdle returns (uint256 ibETHAmount) {
        // convert weth to eth
        IWETH(underlying).withdraw(IERC20(underlying).balanceOf(address(this)));
        // mint the ibETH and assert there is no error
        IBank(token).deposit{ value: address(this).balance }();

        IERC20 _token = IERC20(token);
        // ibETHs are now in this contract
        ibETHAmount = _token.balanceOf(address(this));
        // transfer them to the caller
        _token.safeTransfer(msg.sender, ibETHAmount);
    }

    /**
     * Gets all ibETHs in this contract and redeems underlying tokens.
     * underlying tokens are then transferred to `_account`
     * NOTE: ibETHs needs to be sended here before calling this
     *
     * @return wethAmount underlying tokens redeemd
     */
    function redeem(address _account) external override onlyIdle returns (uint256 wethAmount) {
        // Funds needs to be sended here before calling this
        IERC20 _underlying = IERC20(underlying);
        // redeem all underlying sent in this contract
        IBank(token).withdraw(IERC20(token).balanceOf(address(this)));
        // convert ETH to WETH
        IWETH(underlying).deposit{ value: address(this).balance }();

        wethAmount = _underlying.balanceOf(address(this));
        _underlying.safeTransfer(_account, wethAmount);
    }

    /**
     * @param params : array with all params needed for calculation (see below)
     * @return : yearly net rate
     */
    function nextSupplyRateWithParams(uint256[] memory params) public pure override returns (uint256) {
        /*
        params[0] // glbDebtVal;
        params[1] // address(bank).balance;
        params[2] // reserveRate;
        params[3] // borrowRatePerSec;
        params[4] // _newAmount;
        */
        uint256 balance = params[1].add(params[4]);
        uint256 utilizationManttisa = params[0].mul(EXP_SCALE).div(balance);
        uint256 toSupplier = uint256(1e18).sub(params[2]);
        uint256 ratePerSec = params[3].mul(toSupplier);
        return utilizationManttisa.mul(ratePerSec).mul(SECS_OF_THE_YEAR).div(EXP_SCALE);
    }

    /**
     * Calculate next supply rate, given an `_amount` supplied
     * @param _amount : new underlying amount supplied
     * @return : yearly net rate
     */
    function nextSupplyRate(uint256 _amount) public view override returns (uint256) {
        IBank bank = IBank(token);
        IBankConfig config = IBankConfig(bank.config());

        // uint256 glbDebtVal = bank.glbDebtVal();
        // uint256 balance = address(bank).balance.add(_amount);
        // uint256 borrowRatePerSec = config.getInterestRate(glbDebtVal, balance);
        // uint256 toSupplier = uint256(1e18).sub(config.getReservePoolBps());
        // uint256 ratePerSec = borrowRatePerSec.mul(toSupplier);
        // uint256 utilization = glbDebtVal.div(glbDebtVal.add(balance));

        uint256[] memory params = new uint256[](5);
        params[0] = bank.glbDebtVal();
        params[1] = bank.totalETH();
        // params[1] = address(bank).balance; // bank.totalETH()
        params[2] = config.getReservePoolBps();
        params[3] = config.getInterestRate(params[0], params[1].add(_amount));
        params[4] = _amount;
        // return utilization.mul(ratePerSec).mul(SECS_OF_THE_YEAR);
        return nextSupplyRateWithParams(params);
    }

    /**
     * @return apr : current yearly net rate
     */
    function getAPR() external view override returns (uint256) {
        return nextSupplyRate(0);
    }

    function getPriceInToken() external view override returns (uint256) {
        IBank bank = IBank(token);
        return bank.totalETH().div(bank.totalSupply());
    }
}
