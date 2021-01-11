const nconf = require('nconf')
const cron = require('node-cron')
const Web3 = require('web3');
const Provider = require('@truffle/hdwallet-provider');
const { BigNumber } = require('ethers')

nconf.argv().env()
nconf.file('config.json');


const network = nconf.get('NETWORK');
const from = nconf.get('FROM_ADDRESS')
const privateKey = nconf.get('PRIVATE_KEY');;


const addresses = require(`./addresses/${network}.json`)
const TreasuryABI = require('./abi/Treasury.json');
const BondRedemtionOracleABI = require('./abi/BondRedemtionOracle.json');
const SeigniorageOracleABI = require('./abi/SeigniorageOracle.json');
const MahaUSDOracleABI = require('./abi/MahaUSDOracle.json');
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

    const Treasury = new web3.eth.Contract(
        TreasuryABI.abi,
        addresses.Treasury.address
    );


    const MahaUSDOracle = new web3.eth.Contract(
        MahaUSDOracleABI.abi,
        addresses.MAHAUSDOracle.address
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


    const decimals = BigNumber.from(10).pow(18)
    // const price = BigNumber.from(199).mul(decimals).div(100)
    // console.log('setting price to', price)
    // const mahatx = await MahaUSDOracle.methods.setPrice(price.toString()).send(await getSendParams())
    // console.log(mahatx)

    const gmu = BigNumber.from(299).mul(decimals).div(100)
    console.log('setting gmu price to', gmu)
    const gmuTx = await GMUOracle.methods.setPrice(gmu.toString()).send(await getSendParams())
    console.log(gmuTx)


    cron.schedule('*/7 * * * *', async () => {
        try {
            const receipt = await Treasury.methods.allocateSeigniorage().send(await getSendParams())
            console.log('treasury tx updated', receipt.transactionHash)
        } catch (e) {
            console.log('treasury tx filed; nvm', e)
        }
    });


    cron.schedule('*/5 * * * *', async () => {
        try {
            const receipt1 = await BondRedemtionOracle.methods.update().send(await getSendParams())
            console.log('BondRedemtionOracle updated; tx hash', receipt1.transactionHash)
        } catch (e) {
            console.log('BondRedemtionOracle tx filed; nvm', e)
        }

    });

    cron.schedule('*/6 * * * *', async () => {
        try {
            const receipt2 = await SeigniorageOracle.methods.update().send(await getSendParams())
            console.log('SeigniorageOracle updated; tx hash', receipt2.transactionHash)
        } catch (e) {
            console.log('SeigniorageOracle tx filed; nvm', e)
        }
    });
}

init();