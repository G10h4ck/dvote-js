const axios = require("axios")

console.log("Reading .env (if present)...")
require('dotenv').config({ path: __dirname + "/.env" })


const {
    API: { File, Entity, Census, Vote },
    Network: { Bootnodes, Gateway, Contracts },
    Wrappers: { GatewayInfo, ContentURI, ContentHashedURI },
    Models: { Entity: { TextRecordKeys, EntityMetadataTemplate }, Vote: { ProcessMetadataTemplate } },
    EtherUtils: { Providers, Signers }
} = require("../dist") // require("dvote-js")

const {
    getEntityResolverInstance,
    getVotingProcessInstance,
    deployEntityResolverContract,
    deployVotingProcessContract
} = Contracts

const { getEntityId, getEntityMetadataByAddress, updateEntity } = Entity
const { getRoot, addCensus, addClaim, addClaimBulk, digestHexClaim, getCensusSize, generateCensusId, generateCensusIdSuffix, publishCensus, importRemote, generateProof, dump, dumpPlain } = Census
const { DVoteGateway, Web3Gateway } = Gateway
const { getDefaultGateways, getRandomGatewayInfo } = Bootnodes
const { addFile, fetchFileString } = File
const { createVotingProcess, getVoteMetadata, packagePollEnvelope, submitEnvelope, getBlockHeight, getEnvelopeHeight, getTimeUntilStart, getTimeUntilEnd, getTimeForBlock, getBlockNumberForTime, getEnvelopeList, getEnvelope, getRawResults, getResultsDigest } = Vote

const { Wallet, providers, utils } = require("ethers")
const { Buffer } = require("buffer/")
const fs = require("fs")

const MNEMONIC = process.env.MNEMONIC || "bar bundle start frog dish gauge square subway load easily south bamboo"
const PATH = "m/44'/60'/0'/0/0"
const GATEWAY_PUB_KEY = process.env.GATEWAY_PUB_KEY || "02325f284f50fa52d53579c7873a480b351cc20f7780fa556929f5017283ad2449"
const GATEWAY_DVOTE_URI = process.env.GATEWAY_DVOTE_URI || "wss://myhost/dvote"
const GATEWAY_WEB3_URI = process.env.GATEWAY_WEB3_URI || "https://rpc.slock.it/goerli"
const NETWORK_ID = "goerli"

const gwInfo = new GatewayInfo(GATEWAY_DVOTE_URI, ["file", "census", "vote"], GATEWAY_WEB3_URI, GATEWAY_PUB_KEY)
var web3Gateway = new Web3Gateway(gwInfo)
var dvoteGateway = new DVoteGateway(gwInfo)
dvoteGateway.connect()

async function deployEntityResolver() {
    const provider = new providers.JsonRpcProvider(GATEWAY_WEB3_URI)
    const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)

    console.log("Deploying Entity Resolver contract...")
    const contractInstance = await deployEntityResolverContract({ provider, wallet })
    await contractInstance.deployTransaction.wait()
    console.log("Entity Resolver deployed at", contractInstance.address)

    const myEntityAddress = await wallet.getAddress()
    const myEntityId = getEntityId(myEntityAddress)

    console.log("Entity Address:", myEntityAddress)
    console.log("Entity ID:", myEntityId)

    console.log("Setting 'my-key' = '1234'")
    const tx = await contractInstance.setText(myEntityId, "my-key", "1234")
    await tx.wait()

    console.log("Value set")
    const val = await contractInstance.text(myEntityId, "my-key")
    console.log("Value stored on the blockchain:", val)
}

async function attachToEntityResolver() {
    const provider = new providers.JsonRpcProvider(GATEWAY_WEB3_URI)
    const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)

    console.log("Attaching to contract...")
    const contractInstance = await getEntityResolverInstance({ provider, wallet })

    const myEntityAddress = await wallet.getAddress()
    const myEntityId = getEntityId(myEntityAddress)

    console.log("Entity Address:", myEntityAddress)
    console.log("Entity ID:", myEntityId)

    console.log("Reading 'my-key'")
    const val = await contractInstance.text(myEntityId, "my-key")
    console.log("Value stored on the blockchain:", val)
}

async function deployVotingProcess() {
    const CHAIN_ID = 5
    const provider = new providers.JsonRpcProvider(GATEWAY_WEB3_URI)
    const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)

    console.log("Deploying Voting Process contract...")
    const contractInstance = await deployVotingProcessContract({ provider, wallet }, [CHAIN_ID])
    await contractInstance.deployTransaction.wait()
    console.log("Voting Process deployed at", contractInstance.address)

    // console.log("Setting chainId = 5 (goerli)")
    // let tx = await contractInstance.setChainId(CHAIN_ID)
    // await tx.wait()

    console.log("Setting genesis")
    tx = await contractInstance.setGenesis("ipfs://ipfs-hash-here!sha3-hash-here")
    await tx.wait()

    console.log("Deployment completed!")
}

async function attachToVotingProcess() {
    const provider = new providers.JsonRpcProvider(GATEWAY_WEB3_URI)
    const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)

    console.log("Attaching to contract at from")
    const contractInstance = await getVotingProcessInstance({ provider, wallet })

    console.log("Reading 'genesis'")
    let val = await contractInstance.getGenesis()
    console.log("Value stored on the blockchain:", val)

    console.log("Setting genesis")
    tx = await contractInstance.setGenesis("ipfs://ipfs-hash-2-here!sha3-hash-here")
    await tx.wait()

    console.log("Reading 'genesis'")
    val = await contractInstance.getGenesis()
    console.log("Value stored on the blockchain:", val)
}

async function checkGatewayStatus() {
    var gw
    try {
        // const gwInfo = await getRandomGatewayInfo("goerli")
        // gw = new DVoteGateway(gwInfo["goerli"])
        // await gw.connect()

        const status = await dvoteGateway.getGatewayInfo()
        // console.log("Gateway status", status)
        // gw.disconnect()
    }
    catch (err) {
        // if (gw) gw.disconnect()
        console.error("The gateway can't be reached", err)
    }
}

async function fileUpload() {
    var dvoteGw
    try {
        const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)

        dvoteGw = new DVoteGateway({ uri: GATEWAY_DVOTE_URI, supportedApis: ["file"], publicKey: GATEWAY_PUB_KEY })
        // await dvoteGw.connect()

        // console.log("SIGNING FROM ADDRESS", wallet.address)

        // const strData = fs.readFileSync(__dirname + "/mobile-org-web-action-example.html").toString()
        // console.error("PUTTING STRING OF LENGTH: ", strData.length)
        const strData = Math.random().toString() + Math.random.toString() + Math.random().toString()
        const origin = await addFile(Buffer.from(strData), "random-delete-me.txt", wallet, dvoteGw)
        // console.log("DATA STORED ON:", origin)

        // console.log("\nReading back", origin)
        const data = await fetchFileString(origin, dvoteGw)
        // console.log("DATA:", data)

        // dvoteGw.disconnect()
    } catch (err) {
        // if (dvoteGw) dvoteGw.disconnect()
        console.error(err)
    }
}

async function fileDownload(address) {
    var dvoteGw = dvoteGateway
    try {
        const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)

        // const gws = await getRandomGatewayInfo("goerli")
        // dvoteGw = new DVoteGateway(gws[NETWORK_ID])
        // await dvoteGw.connect()

        // console.log("SIGNING FROM ADDRESS", wallet.address)
        // console.log("Fetching", address)
        const data = await fetchFileString(address, dvoteGw)
        // console.log("DATA:", JSON.stringify(JSON.parse(data), null, 2).length, "bytes")

        // dvoteGw.disconnect()
    } catch (err) {
        // if (dvoteGw) dvoteGw.disconnect()
        console.error(err)
    }
}

async function emptyFeedUpload() {
    const feed = {
        "version": "https://jsonfeed.org/version/1",
        "title": "News Feed",
        "home_page_url": "",
        "description": "",
        "feed_url": "",
        "icon": "",
        "favicon": "",
        "expired": false,
        "items": []
    }
    var dvoteGw
    try {
        const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)

        const gws = await getRandomGatewayInfo("goerli")
        dvoteGw = new DVoteGateway(gws[NETWORK_ID])
        await dvoteGw.connect()

        console.log("SIGNING FROM ADDRESS", wallet.address)

        const strData = JSON.stringify(feed)
        console.error("PUTTING STRING OF LENGTH: ", strData.length)
        const origin = await addFile(Buffer.from(strData), "feed-template.json", wallet, dvoteGw)
        console.log("DATA STORED ON:", origin)

        console.log("\nReading back", origin)
        const data = await fetchFileString(origin, dvoteGw)
        console.log("DATA:", data.length)

        dvoteGw.disconnect()
    } catch (err) {
        if (dvoteGw) dvoteGw.disconnect()
        console.error(err)
    }
}

async function registerEntity() {
    // const provider = new providers.JsonRpcProvider(GATEWAY_WEB3_URI)
    const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)

    const myEntityAddress = await wallet.getAddress()
    const myEntityId = getEntityId(myEntityAddress)

    console.log("Entity ID", myEntityId)
    const gwInfo = new GatewayInfo(GATEWAY_DVOTE_URI, ["file"], GATEWAY_WEB3_URI, GATEWAY_PUB_KEY)
    const web3Gateway = new Web3Gateway(gwInfo)
    const dvoteGateway = new DVoteGateway(gwInfo)
    await dvoteGateway.connect()

    const entityMetadata = Object.assign({}, EntityMetadataTemplate, { name: { default: "TEST ENTITY" } })
    const contentUri = await updateEntity(myEntityAddress, entityMetadata, wallet, web3Gateway, dvoteGateway)

    // show stored values
    console.log("\nEntity registered!\n")
    console.log("The JSON metadata should become generally available in a few minutes")
    console.log(contentUri)

    dvoteGateway.disconnect()
}

async function readEntity() {
    // const provider = new providers.JsonRpcProvider(GATEWAY_WEB3_URI)
    const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)

    const myEntityAddress = await wallet.getAddress()
    // const gwInfo = new GatewayInfo(GATEWAY_DVOTE_URI, ["file"], GATEWAY_WEB3_URI, GATEWAY_PUB_KEY)
    // const web3Gateway = new Web3Gateway(gwInfo)
    // const dvoteGateway = new DVoteGateway(gwInfo)
    // await dvoteGateway.connect()

    try {
        // console.log("ENTITY ID:", getEntityId(myEntityAddress))
        // console.log("GW:", GATEWAY_DVOTE_URI, GATEWAY_WEB3_URI)
        const meta = await getEntityMetadataByAddress(myEntityAddress, web3Gateway, dvoteGateway)
        if (!meta || Object.keys(meta).length == 0) throw new Error("Empty metaƒ")
        // console.log("JSON METADATA\n", Object.keys(meta))
    } catch (err) {
        console.error(err)
    }

    // dvoteGateway.disconnect()
}

async function modifyEntityValues() {
    const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)

    const myEntityAddress = await wallet.getAddress()
    const gwInfo = new GatewayInfo(GATEWAY_DVOTE_URI, ["file"], GATEWAY_WEB3_URI, GATEWAY_PUB_KEY)
    const web3Gateway = new Web3Gateway(gwInfo)
    const dvoteGateway = new DVoteGateway(gwInfo)
    await dvoteGateway.connect()

    console.log("UPDATING ENTITY ID:", getEntityId(myEntityAddress))
    const meta = await getEntityMetadataByAddress(myEntityAddress, web3Gateway, dvoteGateway)

    meta.votingProcesses.active = []  // Discard voting processes
    meta.votingProcesses.ended = []  // Discard voting processes
    await updateEntity(myEntityAddress, meta, wallet, gwInfo)
    console.log("updated")

    dvoteGateway.disconnect()
}

async function gwCensusOperations() {
    // SIGNED
    const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)

    // const gw = new DVoteGateway({ uri: GATEWAY_DVOTE_URI, supportedApis: ["file", "census"], publicKey: GATEWAY_PUB_KEY })
    // await gw.connect()

    try {
        const gw = dvoteGateway

        const censusName = "My census name " + Math.random().toString().substr(2) + Math.random().toString().substr(2)
        const adminPublicKeys = [await wallet.signingKey.publicKey]
        const publicKeys = []

        for (let i = 0; i < 100; i++) {
            const newK = "04" + Math.random().toString().substr(2) + Math.random().toString().substr(2) + Math.random().toString().substr(2) +
                Math.random().toString().substr(2) + Math.random().toString().substr(2) + Math.random().toString().substr(2) +
                Math.random().toString().substr(2) + Math.random().toString().substr(2) + Math.random().toString().substr(2)
            publicKeys.push(newK.substr(0, 128))
        }

        let publicKeyDigestedClaims = publicKeys.map(item => digestHexClaim(item))
        publicKeyDigestedClaims[publicKeyDigestedClaims.length - 1] = "wrong_value"
        // console.log(publicKeyDigestedClaims);

        // Create a census if it doesn't exist
        let result = await addCensus(censusName, adminPublicKeys, gw, wallet)
        // console.log(`ADD CENSUS "${censusName}" RESULT:`)
        // { censusId: "0x.../0x...", merkleRoot: "0x0..."}

        // Add a claim to the new census
        const censusId = result.censusId
        result = await addClaim(censusId, publicKeyDigestedClaims[0], gw, wallet)
        // console.log("ADDED", publicKeyDigestedClaims[0], "TO", censusId)

        // Add claims to the new census
        // const censusId = result.censusId
        result = await addClaimBulk(censusId, publicKeyDigestedClaims.slice(1), gw, wallet)
        // console.log("ADDED", publicKeyDigestedClaims.slice(1), "TO", censusId)
        if (result.invalidClaims.length != 1) throw new Error("INVALID CLAIMS", result.invalidClaims)
        else if (result.invalidClaims[0] != 98) throw new Error("INVALID CLAIMS", result.invalidClaims)
        const merkleRoot = await getRoot(censusId, gw)
        // console.log("MERKLE ROOT", merkleRoot)  // 0x....

        const merkleTree = await publishCensus(censusId, gw, wallet)
        // console.log("PUBLISHED", censusId)
        // console.log(merkleTree)   // ipfs://....

        result = await dump(censusId, gw, wallet)
        // console.log("DUMP", result)

        result = await dumpPlain(censusId, gw, wallet)
        // console.log("DUMP PLAIN", result)

        // gw.disconnect()
    } catch (err) {
        console.error(err)
    }
}

async function createVotingProcessManual() {
    const provider = new providers.JsonRpcProvider(GATEWAY_WEB3_URI)
    const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)

    const gw = new DVoteGateway({ uri: GATEWAY_DVOTE_URI, supportedApis: ["file"], publicKey: GATEWAY_PUB_KEY })
    await gw.connect()

    console.log("Attaching to contract")
    const contractInstance = await getVotingProcessInstance({ provider, wallet })

    console.log("Uploading metadata...")
    const processMetadata = Object.assign({}, ProcessMetadataTemplate, { startBlock: 20000 })
    const strData = JSON.stringify(processMetadata)
    const origin = await addFile(Buffer.from(strData), "process-metadata.json", wallet, gw)
    console.log("process-metadata.json\nDATA STORED ON:", origin)

    const metaCuri = new ContentHashedURI(`ipfs://${origin}`)
    metaCuri.setHashFrom(strData)

    const censusCuri = new ContentHashedURI("http://localhost/")
    censusCuri.setHashFrom("")

    console.log("Creating process with parameters:", metaCuri.toString(), "0x0", censusCuri.toString())
    const tx = await contractInstance.create("poll-vote", metaCuri.toString(), "0x0", censusCuri.toString())
    const result = await tx.wait()
    console.log("RESULT", result)

    gw.disconnect()
}

async function createVotingProcessFull() {
    const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)
    const myEntityAddress = await wallet.getAddress()
    const gwInfo = new GatewayInfo(GATEWAY_DVOTE_URI, ["file"], GATEWAY_WEB3_URI, GATEWAY_PUB_KEY)
    const web3Gateway = new Web3Gateway(gwInfo)
    const dvoteGateway = new DVoteGateway(gwInfo)
    await dvoteGateway.connect()

    const entityMetaPre = await getEntityMetadataByAddress(myEntityAddress, web3Gateway, dvoteGateway)

    const processMetadata = JSON.parse(JSON.stringify(ProcessMetadataTemplate)) // make a copy of the template
    processMetadata.census.merkleRoot = "0x0000000000000000000000000000000000000000000000000"
    processMetadata.census.merkleTree = "ipfs://1234123412341234"
    processMetadata.details.entityId = getEntityId(myEntityAddress)

    const processId = await createVotingProcess(processMetadata, wallet, web3Gateway, dvoteGateway)
    const entityMetaPost = await getEntityMetadataByAddress(myEntityAddress, web3Gateway, dvoteGateway)

    console.log("CREATED", processId)
    console.log("METADATA BEFORE:", entityMetaPre.votingProcesses.active)
    console.log("METADATA AFTER:", entityMetaPost.votingProcesses.active)

    // READING BACK:
    const metadata = await getVoteMetadata(processId, web3Gateway, dvoteGateway)
    console.log("PROCESS METADATA", metadata)

    dvoteGateway.disconnect()
}

async function useVoteApi() {
    const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)
    const myEntityAddress = await wallet.getAddress()

    try {
        // const gwInfo = new GatewayInfo(GATEWAY_DVOTE_URI, ["file", "vote", "census"], GATEWAY_WEB3_URI, GATEWAY_PUB_KEY)
        // const web3Gateway = new Web3Gateway(gwInfo)
        // const dvoteGw = new DVoteGateway(gwInfo)
        // await dvoteGw.connect()
        const dvoteGw = dvoteGateway

        const entityMeta = await getEntityMetadataByAddress(myEntityAddress, web3Gateway, dvoteGw)
        // console.log("- Active processes:", entityMeta.votingProcesses.active.length)
        const processId = entityMeta.votingProcesses.active[entityMeta.votingProcesses.active.length - 1]
        // const processId = "0xf36b729d6226b8257922a60cea6ab80e47686c3f86edbd0749b1c3291e2651ed"
        const processMeta = await getVoteMetadata(processId, web3Gateway, dvoteGw)

        // const censusMerkleRoot = process.env.CENSUS_MERKLE_ROOT // TODO: use the one below
        const censusMerkleRoot = processMeta.census.merkleRoot

        // console.log("Reading", processId)

        // console.log("BLOCKCHAIN INFO:\n")
        // console.log("- Process startBlock:", processMeta.startBlock)
        // console.log("- Process endBlock:", processMeta.startBlock + processMeta.numberOfBlocks)
        // console.log("- Census size:", await getCensusSize(censusMerkleRoot, dvoteGw))
        // console.log("- Block height:", await getBlockHeight(dvoteGw))
        // console.log("- Envelope height:", await getEnvelopeHeight(processId, dvoteGw))
        let remainingSeconds = await getTimeUntilStart(processId, processMeta.startBlock, dvoteGw)
        // console.log("- Seconds until start:", remainingSeconds == 0 ? "[already started]" : remainingSeconds)
        remainingSeconds = await getTimeUntilEnd(processId, processMeta.startBlock, processMeta.numberOfBlocks, dvoteGw)
        // console.log("- Seconds until end:", remainingSeconds == 0 ? "[already ended]" : remainingSeconds)
        // console.log("- Time at block 500:", await getTimeForBlock(processId, 500, dvoteGw))
        // console.log("- Block on 10/10/2019:", await getBlockNumberForTime(processId, new Date(2019, 9, 10), dvoteGw))

        // const publicKeyHash = digestHexClaim(wallet["signingKey"].publicKey)
        // const merkleProof = await generateProof(censusMerkleRoot, publicKeyHash, dvoteGw)
        // const votes = [1, 2, 1]
        // const voteEnvelope = await packagePollEnvelope(votes, merkleProof, processId, wallet)

        // console.log("- Poll Envelope:", voteEnvelope)

        // console.log("- Submitting vote envelope")
        // await submitEnvelope(voteEnvelope, dvoteGw)

        // const envelopeList = await getEnvelopeList(processId, 0, 100, dvoteGw)
        // console.log("- Envelope list:", envelopeList);
        // if (envelopeList.length > 0)
        //     console.log("- Retrieved Vote:", await getEnvelope(processId, dvoteGw, envelopeList[envelopeList.length - 1]))

        //     console.log("getRawRawResults",await getRawResults(processId, dvoteGw))
        //     console.log("getResultsDigest",JSON.stringify(await getResultsDigest(processId, web3Gateway, dvoteGw), null, 2))
        // dvoteGw.disconnect()
    }
    catch (err) {
        console.error(err)
    }
}

async function submitVoteBatch() {
    const fromAccountIdx = 6
    const toAccountIdx = 9

    // const myEntityId = "0x180dd5765d9f7ecef810b565a2e5bd14a3ccd536c442b3de74867df552855e85"
    // const entityMeta = await getEntityMetadata(myEntityAddress, gwInfo)
    // const processId = entityMeta.votingProcesses.active[entityMeta.votingProcesses.active.length - 1]

    const processId = "0xfbfdb1795eadc8fb8b0249e8a597ab7cc4a6a2a5f3a87db454eadda818cba014"

    const dvoteGw = new DVoteGateway({ uri: GATEWAY_DVOTE_URI, supportedApis: ["file", "vote", "census"], publicKey: GATEWAY_PUB_KEY })
    await dvoteGw.connect()

    const processMeta = await getVoteMetadata(processId, gwInfo)
    const censusMerkleRoot = processMeta.census.merkleRoot

    console.log("On Process", processId)

    // Load a set of registered accounts that can vote on the process
    if (!require('fs').existsSync(__dirname + "/user-accounts.json")) throw new Error("File user-accounts.json does not exist")
    var censusAccounts = require(__dirname + "/user-accounts.json")
    if (!Array.isArray(censusAccounts)) throw new Error("File user-accounts.json does not contain a valid array")
    else if (toAccountIdx >= censusAccounts.length) throw new Error("'toAccountIdx' is greater than the size of the user accounts array")

    for (let idx = fromAccountIdx; idx < toAccountIdx; idx++) {
        try {
            const { mnemonic, publicKey, address } = censusAccounts[idx]
            console.log("Using account", idx, publicKey)

            const wallet = Wallet.fromMnemonic(mnemonic, PATH)
            // const myEntityAddress = await wallet.getAddress()

            const publicKeyHash = digestHexClaim(wallet["signingKey"].publicKey)
            const merkleProof = await generateProof(censusMerkleRoot, publicKeyHash, dvoteGw)
            const votes = [1]
            const voteEnvelope = await packagePollEnvelope(votes, merkleProof, processId, wallet)

            console.log("- Submitting vote envelope")
            await submitEnvelope(voteEnvelope, dvoteGw)

            console.log("- Envelope height is now:", await getEnvelopeHeight(processId, dvoteGw))
        } catch (err) {
            console.error("- Failed:", err)
        }
    }

    dvoteGw.disconnect()
}

async function checkSignature() {
    const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)
    const message = "Hello dapp"
    const signature = await wallet.signMessage(message)
    const expectedAddress = await wallet.getAddress()
    const expectedPublicKey = wallet.signingKey.publicKey

    console.log("ISSUING SIGNATURE")
    console.log("ADDR:    ", expectedAddress)
    console.log("PUB K:   ", expectedPublicKey)
    console.log("SIG      ", signature)
    console.log()

    // Approach 1
    const actualAddress = utils.verifyMessage(message, signature)

    console.log("APPROACH 1")
    console.log("EXPECTED ADDR: ", expectedAddress)
    console.log("ACTUAL ADDR:   ", actualAddress)
    console.log()

    // Approach 2
    const msgHash = utils.hashMessage(message);
    const msgHashBytes = utils.arrayify(msgHash);

    // Now you have the digest,
    const recoveredPubKey = utils.recoverPublicKey(msgHashBytes, signature);
    const recoveredAddress = utils.recoverAddress(msgHashBytes, signature);

    const matches = expectedPublicKey === recoveredPubKey

    console.log("APPROACH 2")
    console.log("EXPECTED ADDR:    ", expectedAddress)
    console.log("RECOVERED ADDR:   ", recoveredAddress)

    console.log("EXPECTED PUB K:   ", expectedPublicKey)
    console.log("RECOVERED PUB K:  ", recoveredPubKey)

    console.log("SIGNATURE VALID:  ", matches)
    console.log()
}

async function fetchMerkleProof() {
    // const gws = await getRandomGatewayInfo("goerli")
    // const dvoteGateway = new DVoteGateway(gws[NETWORK_ID])
    // await dvoteGateway.connect()

    // console.log("FETCHING CLAIM", process.env.BASE64_CLAIM_DATA)
    // console.log("on Merkle Tree", process.env.CENSUS_MERKLE_ROOT)

    const siblings = await generateProof(process.env.CENSUS_MERKLE_ROOT, process.env.BASE64_CLAIM_DATA, dvoteGateway)
    // console.log("SIBLINGS:", siblings)

    // dvoteGateway.disconnect()
}

async function gatewayHealthCheck() {
    // SIGNED
    const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)

    try {
        const myEntityAddress = await wallet.getAddress()
        const myEntityId = getEntityId(myEntityAddress)

        const gws = await getDefaultGateways("goerli")

        const URL = "https://hnrss.org/newest"
        const response = await axios.get(URL)

        for (let networkId in gws) {
            for (let gw of gws[networkId].dvote) {
                // console.log("Checking", gw.uri, "...")

                await gw.connect()
                const origin = await File.addFile(response.data, "hn-rss.xml", wallet, gw)
                // console.log("STORED ON", origin, "USING", gw.uri)
                gw.disconnect()
            }

            for (let gw of gws[networkId].web3) {
                // console.log("Checking Web3 GW...")

                const instance = await getEntityResolverInstance({ provider: gw.getProvider(), wallet })
                const tx = await instance.setText(myEntityId, "dummy", "1234")
                await tx.wait()
            }
        }
    }
    catch (err) {
        console.error(err)
    }
}

async function gatewayRawRequest() {
    // DVOTE
    // const gws = await getRandomGatewayInfo("goerli")
    // gw = new DVoteGateway(gws[NETWORK_ID])
    // console.log("THE DVOTE GW:", gw.publicKey)
    const gw = dvoteGateway

    try {
        // await gw.connect()

        // SIGNED
        const wallet = Wallet.fromMnemonic(MNEMONIC, PATH)

        const req = { method: "test" }  // Low level raw request
        const timeout = 20
        const r = await gw.sendMessage(req, wallet, timeout)
        // console.log("RESPONSE:", r)

        // UNSIGNED
        var origin = "ipfs://QmUNZNB1u31eoAw1ooqXRGxGvSQg4Y7MdTTLUwjEp86WnE"
        // console.log("\nReading from", GATEWAY_DVOTE_URI)
        // console.log("\nReading", origin)
        var data = await fetchFileString(origin, gw)
        // console.log("DATA:", data.length, "bytes")

        origin = "ipfs://QmVtLegYaQhBErsAVgtbaVe7HCYL7ue1rArPbHwPTcoTCi"
        // console.log("\nReading from", GATEWAY_DVOTE_URI)
        // console.log("\nReading", origin)
        data = await fetchFileString(origin, gw)
        // console.log("DATA:", data.length, "bytes")

        origin = "ipfs://QmXLgWLYfa826DSCawfb1R34XBQYzs1z4xiLoChu7hUZyL"
        // console.log("\nReading from", GATEWAY_DVOTE_URI)
        // console.log("\nReading", origin)
        data = await fetchFileString(origin, gw)
        // console.log("DATA:", data.length, "bytes")

        // gw.disconnect()
    } catch (err) {
        console.error(err)
    }
}

async function ensResolver() {
    // const provider = new providers.EtherscanProvider()
    const provider = new providers.JsonRpcProvider(GATEWAY_WEB3_URI)

    const resolverAddr = await provider.resolveName("entity-resolver.vocdoni.eth")
    const processAddr = await provider.resolveName("voting-process.vocdoni.eth")

    console.log("Entity Resolver contract address", resolverAddr)
    console.log("Voting Process contract address", processAddr)
}

async function round(idx) {
    // Ethereum

    // await deployEntityResolver()
    // await attachToEntityResolver()
    // await deployVotingProcess()
    // await attachToVotingProcess()

    // Vocdoni API's

    console.log(idx, "> checkGatewayStatus()")
    await checkGatewayStatus()
    console.log(idx, "> fileUpload(random)")
    await fileUpload()
    // console.log("fileDownload()")
    // await fileDownload("ipfs://QmXLgWLYfa826DSCawfb1R34XBQYzs1z4xiLoChu7hUZyL")
    // await emptyFeedUpload()
    // await registerEntity()
    console.log(idx, "> readEntity()")
    await readEntity()
    // await modifyEntityValues()
    console.log(idx, "> gwCensusOperations()")
    await gwCensusOperations()
    // await createVotingProcessManual()
    // await createVotingProcessFull()
    console.log(idx, "> useVoteApi()")
    await useVoteApi()
    // await submitVoteBatch()
    console.log(idx, "> fetchMerkleProof()")
    await fetchMerkleProof()
    // await checkSignature()
    console.log(idx, "> gatewayRawRequest()")
    await gatewayRawRequest()

    console.log(idx, "> gatewayHealthCheck()")
    await gatewayHealthCheck()
    // await ensResolver()
}

(async function () {
    while (true) {
        const roundSize = 50
        const proms = []
        console.log("Launching", roundSize, "executions")
        for (let i = 0; i < roundSize; i++) proms.push(round(i))

        await Promise.all(proms)
            .then(() => console.log("ROUND DONE -----"))
            .catch(err => console.error("@@@@@@@@@@@@@@@@@@@@\nERR: ", err.message, "\n@@@@@@@@@@@@@@@@@@@@\n"))

        console.log("--------\n--------\n--------\n--------\n--------\n--------\n--------\n--------\n--------\n--------\n--------\n--------\n")
    }
})()