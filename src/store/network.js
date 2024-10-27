// Utilities
import { defineStore } from 'pinia'
import { useChainStore } from './chains';
import gql from 'graphql-tag';
import web3 from 'web3';
import BigNumber from 'bignumber.js';

const chainStore = useChainStore();

export const useNetworkStore = defineStore('network', {
  state: () => ({
    networks: {
      "mainnet": {
        totalTokensSignalled: "0",
        issuancePerBlock: "0",
        issuancePerYear: "0",
        totalSupply: "0",
        currentEpoch: "0",
        totalTokensAllocated: "0",
      },
      "arbitrum-one": {
        totalTokensSignalled: "0",
        issuancePerBlock: "0",
        issuancePerYear: "0",
        totalSupply: "0",
        currentEpoch: "0",
        totalTokensAllocated: "0",
      },
      "sepolia": {
        totalTokensSignalled: "0",
        issuancePerBlock: "0",
        issuancePerYear: "0",
        totalSupply: "0",
        currentEpoch: "0",
        totalTokensAllocated: "0",
      },
      "arbitrum-sepolia": {
        totalTokensSignalled: "0",
        issuancePerBlock: "0",
        issuancePerYear: "0",
        totalSupply: "0",
        currentEpoch: "0",
        totalTokensAllocated: "0",
      }
    }
  }),
  getters: {
    getTotalTokensSignalled: (state) => state.networks[chainStore.getChainID].totalTokensSignalled,
    getTotalSupply: (state) => state.networks[chainStore.getChainID].totalSupply,
    getCurrentEpoch: (state) => state.networks[chainStore.getChainID].currentEpoch,
    getIssuancePerBlock: (state) => state.networks[chainStore.getChainID].issuancePerBlock,
    getIssuancePerYear: (state) => state.networks[chainStore.getChainID].issuancePerYear,
    getTotalTokensAllocated: (state) => state.networks[chainStore.getChainID].totalTokensAllocated,
  },
  actions: {
    async init(){
      let queries = [];
      for(let chain of chainStore.getChains){
        queries.push(chain.networkSubgraphClient.query({
          query: gql`query{
            graphNetwork(id: 1){
              totalTokensSignalled
              networkGRTIssuancePerBlock
              totalSupply
              currentEpoch
              totalTokensAllocated
            }
          }`,
        }).then((data) => {
          console.log(data);
          this.networks[chain.id].totalTokensSignalled = data.data.graphNetwork.totalTokensSignalled;
          this.networks[chain.id].issuancePerBlock = data.data.graphNetwork.networkGRTIssuancePerBlock;
          this.networks[chain.id].totalSupply = data.data.graphNetwork.totalSupply;
          this.networks[chain.id].currentEpoch = data.data.graphNetwork.currentEpoch;
          this.networks[chain.id].issuancePerYear = data.data.graphNetwork.networkGRTIssuancePerBlock * chainStore.getBlocksPerYear;
          this.networks[chain.id].totalTokensAllocated = data.data.graphNetwork.totalTokensAllocated;
        }).catch((err) => {
          this.loading = false;
          if(err.graphQLErrors[0]?.message){
            console.error(`Network API error: ${err.graphQLErrors[0].message}`);
            alert(`Network API Error: ${err.graphQLErrors[0].message}`);
          }
          if(err.message){
            console.error(`Network query error: ${err.message}`);
            alert(`Network Error: ${err.message}`);
          }
        }));
      }
      return queries;
    }
  }
})
