const nconf = require('nconf')
const cron = require('node-cron')
const Web3 = require('web3');
const Provider = require('@truffle/hdwallet-provider');

nconf.argv().env()
nconf.file('config.json');


const network = nconf.get('NETWORK');
const from = nconf.get('FROM_ADDRESS')
const privateKey = nconf.get('PRIVATE_KEY');;
const infuraUrl = `https://${network}.infura.io/v3/${nconf.get('INFURA_KEY')}`

const addresses = require(`./addresses/${network}.json`)
const TreasuryABI = require('./abi/Treasury.json');
const BondRedemtionOracleABI = require('./abi/BondRedemtionOracle.json');
const SeigniorageOracleABI = require('./abi/SeigniorageOracle.json');


const init = async () => {
    const provider = new Provider(privateKey, infuraUrl);
    const web3 = new Web3(provider);
    const networkId = await web3.eth.net.getId();

    console.log('i am in newtwork id', networkId)

    const Treasury = new web3.eth.Contract(
        TreasuryABI.abi,
        addresses.Treasury.address
    );

    const BondRedemtionOracle = new web3.eth.Contract(
        BondRedemtionOracleABI.abi,
        addresses.BondRedemtionOracle.address
    );

    const SeigniorageOracle = new web3.eth.Contract(
        SeigniorageOracleABI.abi,
        addresses.SeigniorageOracle.address
    );

    cron.schedule('*/10 * * * *', async () => {
        const receipt = await Treasury.methods.allocateSeigniorage().send({ from })
        console.log('treasury tx updated', receipt.transactionHash)
    });

    cron.schedule('*/5 * * * *', async () => {
        const receipt1 = await BondRedemtionOracle.methods.update().send({ from })
        console.log('BondRedemtionOracle updated; tx hash', receipt1.transactionHash)

        const receipt2 = await SeigniorageOracle.methods.update().send({ from })
        console.log('SeigniorageOracle updated; tx hash', receipt2.transactionHash)
    });
}

init();