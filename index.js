const nconf = require('nconf')
const cron = require('node-cron')
const Web3 = require('web3');
const rp = require('request-promise');
const Provider = require('@truffle/hdwallet-provider');
const ethers = require('ethers')


nconf.argv().env()
nconf.file('config.json');


const network = nconf.get('NETWORK');
const from = nconf.get('FROM_ADDRESS')
const privateKey = nconf.get('PRIVATE_KEY');;


const addresses = require(`./addresses/${network}.json`)
const TreasuryABI = require('./abi/Treasury.json');
const BondRedemtionOracleABI = require('./abi/BondRedemtionOracle.json');
const SeigniorageOracleABI = require('./abi/SeigniorageOracle.json');
const ArthMahaOracleABI = require('./abi/ArthMahaOracle.json');
const GMUOracleABI = require('./abi/GMUOracle.json');


const init = async () => {
    const provider = new Provider(privateKey, nconf.get('WEB3_HTTP_URL'));
    const web3 = new Web3(provider);
    const networkId = await web3.eth.net.getId();

    console.log('i am in newtwork id', networkId)

    const getSendParams = async (nonceBump = 0) => {
        return {
            from,
            nonce: await web3.eth.getTransactionCount(from) + nonceBump,
            gasPrice: await web3.eth.getGasPrice()
        }
    }

    const getPriceFromGecko = async (coinId = 'mahadao', currency = 'usd') => {
        try {
            console.log('Fetching price from coin gecko for id', coinId);
            const priceInJsonString = await rp(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd,eth`);

            if (!priceInJsonString.includes(coinId)) return null;

            return JSON.parse(priceInJsonString)[coinId][currency];
        } catch (e) {
            return null;
        }
    }

    const Treasury = new web3.eth.Contract(
        TreasuryABI.abi,
        addresses.Treasury.address
    );


    const ArthMahaOracle = new web3.eth.Contract(
        ArthMahaOracleABI.abi,
        addresses.ArthMahaOracle.address
    );

    const GMUOracle = new web3.eth.Contract(
        GMUOracleABI.abi,
        addresses.GMUOracle.address
    );

    const BondRedemtionOracle = new web3.eth.Contract(
        BondRedemtionOracleABI.abi,
        addresses.BondRedemtionOracle.address
    );

    const SeigniorageOracle = new web3.eth.Contract(
        SeigniorageOracleABI.abi,
        addresses.SeigniorageOracle.address
    );


    // const decimals = BigNumber.from(10).pow(18)
    // const price = BigNumber.from(199).mul(decimals).div(100)
    // console.log('setting price to', price)
    // const mahatx = await ArthMahaOracle.methods.setPrice(price.toString()).send(await getSendParams())
    // console.log(mahatx)


    // try {
    //     // const init = await Treasury.methods.initialize()
    //     // console.log(init.transactionHash)

    // const gmu = BigNumber.from(90).mul(decimals).div(100)
    // console.log('setting gmu price to', gmu)
    // const gmuTx = await GMUOracle.methods.setPrice(gmu.toString()).send(await getSendParams())
    // console.log(gmuTx.transactionHash)

    // } catch (error) {
    //     console.log(error)
    // }

    // const receipt2 = await Treasury.methods.initialize().send(await getSendParams())
    // console.log('treasury tx init', receipt2.transactionHash)


    // const receipt11 = await Treasury.methods.setArthLiquidityBoardroom('0xA0d61C2c2cBD80Af404adB0432533DC3BE6ED25C', 1).send(await getSendParams())
    // console.log('treasury tx init', receipt11.transactionHash)

    // const receipt12 = await Treasury.methods.setMahaLiquidityBoardroom('0xA0d61C2c2cBD80Af404adB0432533DC3BE6ED25C', 1).send(await getSendParams())
    // console.log('treasury tx init', receipt12.transactionHash)

    // const receipt3 = await Treasury.methods.allocateSeigniorage().send(await getSendParams())
    // console.log('treasury tx updated', receipt3.transactionHash)

    // Run script for ARTHMAHAOracle every hour.
    cron.schedule('* */1 * * *', async () => {
        const mahaPrice = await getPriceFromGecko('mahadao', 'usd');
        const arthPrice = await getPriceFromGecko('arth', 'usd');

        // Lets say price of 1 ARTH is 1$ and price of 1 MAHA is 10$.
        // Then ARTH/MAHA = 1/10 = 0.1
        // Then 1 ARTH = 0.1 * 1 MAHA
        if (mahaPrice !== null || arthPrice !== null) {
            console.log('ARTH is at', arthPrice);
            console.log('MAHA is at', mahaPrice);

            // In Javascript Numbers.
            const arthToMaha = arthPrice / mahaPrice;
            const arthToMahaInBigNumber = ethers.utils.parseEther(`${arthToMaha}`);

            // await ArthMahaOracle.methods.setPrice(arthToMahaInBigNumber.toString()).send(await getSendParams())
            console.log(arthToMahaInBigNumber.toString());
        }
    });

    cron.schedule('*/5 * * * *', async () => {
        try {
            const receipt = await Treasury.methods.allocateSeigniorage().send(await getSendParams())
            console.log('treasury tx updated', receipt.transactionHash)
        } catch (e) {
            console.log('treasury tx filed; nvm', e)
        }
    });


    cron.schedule('*/10 * * * *', async () => {
        try {
            console.log('updating bond oracle', addresses.BondRedemtionOracle.address)
            const receipt1 = await BondRedemtionOracle.methods.update().send(await getSendParams())
            console.log('BondRedemtionOracle updated; tx hash', receipt1.transactionHash)
        } catch (e) {
            console.log('BondRedemtionOracle tx filed; nvm', e)
        }
    });

    cron.schedule('*/15 * * * *', async () => {
        try {
            console.log('updating ')
            const receipt2 = await SeigniorageOracle.methods.update().send(await getSendParams())
            console.log('SeigniorageOracle updated; tx hash', receipt2.transactionHash)
        } catch (e) {
            console.log('SeigniorageOracle tx filed; nvm', e)
        }
    });
}


init();