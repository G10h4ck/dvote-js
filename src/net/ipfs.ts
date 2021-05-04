import { IPFS_GATEWAY_LIST_URI } from "../constants"
import axios from "axios"
import { Buffer } from 'buffer/'

export class IPFS {
    /**
     * Attempt to fetch a file from the list of well-known IPFS gateways
     * @param hash IPFS raw hash (no leading protocol)
     */
    static async fetchHash(hash: string): Promise<Buffer> {
        const response = await axios.get(IPFS_GATEWAY_LIST_URI)

        if (!Array.isArray(response.data)) throw new Error("Could not fetch the IPFS gateway list")

        for (let gw of response.data) {
            try {
                const res = await axios.get(gw.replace(/:hash$/g, hash))
                return Buffer.from(res.data)
            } catch (err) {
                continue
            }
        }
    }
}
