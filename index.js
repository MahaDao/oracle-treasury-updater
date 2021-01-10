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
const infuraUrl = `https://${network}.infura.io/v3/${nconf.get('INFURA_KEY')}`
const ganacheUrl = 'http://127.0.0.1:7545'

const addresses = require(`./addresses/${network}.json`)
const TreasuryABI = require('./abi/Treasury.json');
const BondRedemtionOracleABI = require('./abi/BondRedemtionOracle.json');
const SeigniorageOracleABI = require('./abi/SeigniorageOracle.json');
const MahaUSDOracleABI = require('./abi/MahaUSDOracle.json');


const init = async () => {
    const provider = new Provider(privateKey, network === 'development' ? ganacheUrl : infuraUrl);
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

    const BondRedemtionOracle = new web3.eth.Contract(
        BondRedemtionOracleABI.abi,
        addresses.BondRedemtionOracle.address
    );

    const SeigniorageOracle = new web3.eth.Contract(
        SeigniorageOracleABI.abi,
        addresses.SeigniorageOracle.address
    );


    const decimals = BigNumber.from(10).pow(18)
    const price = BigNumber.from(99).mul(decimals).div(100)
    console.log('setting price to', price)
    await MahaUSDOracle.methods.setPrice(price.toString()).send(await getSendParams())

    cron.schedule('*/10 * * * *', async () => {
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

        try {
            const receipt2 = await SeigniorageOracle.methods.update().send(await getSendParams(1))
            console.log('SeigniorageOracle updated; tx hash', receipt2.transactionHash)
        } catch (e) {
            console.log('SeigniorageOracle tx filed; nvm', e)
        }
    });
}

init();