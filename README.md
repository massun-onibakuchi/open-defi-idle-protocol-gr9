# Alpha Homora v1 Wrapper for Idle Protocol

The Alpha Homora v1 wrapper is a wrapper that implements the Idle protocol interface `IIdleProtocol`.

Idle is a decentralized protocol dedicated to bringing automatic asset allocation and aggregation to the interest-bearing tokens economy. Idle aims to unlock the power of decentralized finance for everyone by single vehicle that automatically rebalances between underlying providers to always maintain the highest rates or the optimal risk/return allocation.

## Concept

The Idle protocol provides the best strategy for each asset. The strategies that handle stable assets such as DAI and USDC use multiple yield sources like AAVE, Compound, dydx. However, However, the ETH strategy is usually 100% allocated to Compound, and lacks diversity.

Check best-yield ETH strategy status [here](https://idle.finance/#/dashboard/stats/best/WETH)

We know that Compound is one of the most battle-tested DeFi protocol and is relatively safe, but the interest rate for ETH is a bit lower.

Alpha Homora is the first leveraged yield farming and leveraged liquidity providing product in DeFi.
Alpha Homora v1 provides ETH lending/borrowing, whose supply rate is higher than Compound's one. We can see APY [here](https://homora.alphafinance.io/earn)

By integrating Alpha Homora V1 as a yield source, The idle protocol can yield competitive APY and more umami flavors.

[Learn more in the Earn on ETH section.](https://alphafinancelab.gitbook.io/alpha-homora/#earn-on-eth)

## Docs

The wrapper `IdleAlphaHomora` implements the Idle protocol interface `IIdleProtocol`.

[Idle Protocol Doc - Get integrated into Idle](https://developers.idle.finance/integrators/get-integrated-into-idle)

### AlphaHomoraV1

When users deposit ETH to Bank, they receive a proportional amount of ibETH token, a tradable and interest-bearing asset that represents their shares of ETH in the bank pool, similar to cToken in Compound.

[Alpha Homora V1 Developer Doc](https://alphafinancelab.gitbook.io/alpha-homora-developer-doc/become-to-the-lender-of-alpha-homora-v1)

[Alpha Homora V1 GitHub](https://github.com/AlphaFinanceLab/alphahomora)

## Setup

To install dependencies,run  
`yarn`

You will needs to enviroment variables to run the tests.
Create a `.env` file in the root directory of your project.

```
ETHERSCAN_API_KEY=
ALCHEMY_API_KEY=
```

You will get the first one from [Etherscan](https://etherscan.io/).
You will get the second one from [Alchemy](https://dashboard.alchemyapi.io/).

## Compile

To compile, run  
`yarn hardhat compile`

## Test

`yarn test`
