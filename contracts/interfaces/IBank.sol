// SPDX-License-Identifier: GPL-3.0
/// @title Alpha Homora v1 Bank interface
/// @dev Alpha Homora v1 Bank.sol 5
pragma solidity >=0.7.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IBankConfig.sol";

interface IBank is IERC20 {
    function config() external view returns (IBankConfig);

    function glbDebtVal() external view returns (uint256);

    /// @dev Return the pending interest that will be accrued in the next call.
    /// @param msgValue Balance value to subtract off address(this).balance when called from payable functions.
    function pendingInterest(uint256 msgValue) external view returns (uint256);

    /// @dev Return the ETH debt value given the debt share. Be careful of unaccrued interests.
    /// @param debtShare The debt share to be converted.
    function debtShareToVal(uint256 debtShare) external view returns (uint256);

    /// @dev Return the debt share for the given debt value. Be careful of unaccrued interests.
    /// @param debtVal The debt value to be converted.
    function debtValToShare(uint256 debtVal) external view returns (uint256);

    /// @dev Return ETH value and debt of the given position. Be careful of unaccrued interests.
    /// @param id The position ID to query.
    function positionInfo(uint256 id) external view returns (uint256, uint256);

    /// @dev Return the total ETH entitled to the token holders. Be careful of unaccrued interests.
    function totalETH() external view returns (uint256);

    /// @dev Add more ETH to the bank. Hope to get some good returns.
    function deposit() external payable;

    /// @dev Withdraw ETH from the bank by burning the share tokens.
    function withdraw(uint256 share) external;
}
