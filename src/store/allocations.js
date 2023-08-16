import { defineStore } from 'pinia'
import { useNetworkStore } from '@/store/network';
import { useAccountStore } from '@/store/accounts';
import { useChainStore } from '@/store/chains';
import gql from 'graphql-tag';
import moment from 'moment';
import BigNumber from 'bignumber.js';
import { calculateApr, calculateReadableDuration, calculateAllocationDailyRewards, indexerCut } from '@/plugins/commonCalcs';


const networkStore = useNetworkStore();
const accountStore = useAccountStore();
const chainStore = useChainStore();

networkStore.init();
accountStore.fetchData();


export const useAllocationStore = defineStore('allocationStore', {
  state: () => ({
    allocations: [],
    pendingRewards: [],
    selected: [],
    loaded: false,
    loading: false,
  }),
  getters: {
    getAllocations: (state) => {
      let allocations = [];
      for(let i = 0; i < state.allocations.length; i++){
        allocations[i] = {
          ...state.allocations[i],
          ...state.getActiveDurations[i],
          ...state.getReadableDurations[i],
          ...state.getEpochDurations[i],
          ...state.getProportions[i],
          ...state.getAprs[i],
          ...state.getDailyRewards[i],
          ...state.getDailyRewardsCuts[i],
          ...state.getPendingRewards[i],
          ...state.getPendingRewardsCuts[i],
        };
      }
      console.log(state.allocations);
      console.log(allocations);
      return allocations;
    },
    getSelectedAllocations: (state) => {
      let allocations = [];
      for(let i = 0; i < state.selected.length; i++){
        let allocation = state.allocations.find((e) => e.id == state.selected[i]);
        allocations[i] = {
          ...allocation,
        }
      }
      return allocations;
    },
    getActiveDurations: (state) => {
      let activeDurations = [];
      for(let i = 0; i < state.allocations.length; i++){
        let allocation = state.allocations[i];
        activeDurations[i] = { activeDuration: moment().unix() - allocation.createdAt }
      }
      return activeDurations;
    },
    getReadableDurations: (state) => {
      let readableDurations = [];
      for(let i = 0; i < state.allocations.length; i++){

        readableDurations[i] = { readableDuration: calculateReadableDuration(state.getActiveDurations[i].activeDuration) }
      }
      return readableDurations;
    },
    getEpochDurations: (state) => {
      let epochDurations = [];
      for(let i = 0; i < state.allocations.length; i++){
        let allocation = state.allocations[i];
        epochDurations[i] = { epochDuration:networkStore.getCurrentEpoch - allocation.createdAtEpoch };
      }
      return epochDurations;
    },
    getProportions: (state) => {
      let proportions = [];
      for(let i = 0; i < state.allocations.length; i++){
        let allocation = state.allocations[i];
        if (allocation.subgraphDeployment.stakedTokens > 0)
          proportions[i] = { proportion: allocation.subgraphDeployment.signalledTokens / allocation.subgraphDeployment.stakedTokens };
        else
          proportions[i] = { proportion:  0 };
      }
      return proportions;
    },
    getAprs: (state) => {
      let aprs = [];
      for(let i = 0; i < state.allocations.length; i++){
        let allocation = state.allocations[i];
        if (allocation.subgraphDeployment.stakedTokens > 0)
          aprs[i] = { apr: calculateApr(allocation.subgraphDeployment.signalledTokens, allocation.subgraphDeployment.stakedTokens, networkStore).toString()};
        else
          aprs[i] = { apr: 0 };
      }
      return aprs;
    },
    getDailyRewards: (state) => {
      let dailyRewards = [];
      for(let i = 0; i < state.allocations.length; i++){
        let allocation = state.allocations[i];
        if (allocation.subgraphDeployment.stakedTokens > 0){
          dailyRewards[i] = { dailyRewards: calculateAllocationDailyRewards(allocation.subgraphDeployment.signalledTokens, allocation.subgraphDeployment.stakedTokens, allocation.allocatedTokens, networkStore)}
        }else{
          dailyRewards[i] = { dailyRewards: 0 };
        }
      }
      return dailyRewards;
    },
    getDailyRewardsCuts() {
      let dailyRewardsCuts = [];
      for(let i = 0; i < this.allocations.length; i++){
        let allocation = this.allocations[i];
        if (allocation.subgraphDeployment.stakedTokens > 0 && !accountStore.loading){
          dailyRewardsCuts[i] = { dailyRewardsCut: indexerCut(this.getDailyRewards[i].dailyRewards, accountStore.cut) };
        }else{
          dailyRewardsCuts[i] = { dailyRewardsCut: 0 };
        }
      }
      return dailyRewardsCuts;
    },
    getPendingRewards: (state) => {
      let pendingRewards = [];
      for(let i = 0; i < state.pendingRewards.length; i++){
        pendingRewards[i] = { pendingRewards: state.pendingRewards[i] }
      }
      return pendingRewards;
    },
    getPendingRewardsCuts() {
      let pendingRewardsCuts = [];
      for(let i = 0; i < this.pendingRewards.length; i++){
        let pendingReward = this.pendingRewards[i];
        if(pendingReward.value > 0 && !accountStore.loading){
          pendingRewardsCuts[i] = { pendingRewardsCut: indexerCut(this.getPendingRewards[i].pendingRewards.value, accountStore.cut) };
        }else{
          pendingRewardsCuts[i] = { pendingRewardsCut: BigNumber(0) };
        }
      }
      return pendingRewardsCuts;
    },
    totalAllocatedStake: (state) => {
      let totalAllocatedStake = new BigNumber(0);
      if(state.allocations.length > 0){
        for(const i in state.allocations){
          totalAllocatedStake = totalAllocatedStake.plus(state.allocations[i].allocatedTokens);
        }
      }
      return totalAllocatedStake;
    },
    totalRewardsPerYear: (state) => {
      let totalRewardsPerYear = new BigNumber(0);
      if(state.allocations.length > 0){
        for(const i in state.allocations){
          if(!new BigNumber(state.allocations[i].allocatedTokens).isEqualTo(new BigNumber(0)) && !new BigNumber(state.allocations[i].subgraphDeployment.signalledTokens).isEqualTo(new BigNumber(0))){
            totalRewardsPerYear = totalRewardsPerYear.plus(
                new BigNumber(state.allocations[i].subgraphDeployment.signalledTokens)
                    .dividedBy(networkStore.getTotalTokensSignalled)
                    .multipliedBy(networkStore.getIssuancePerYear)
                    .multipliedBy(
                        new BigNumber(state.allocations[i].allocatedTokens).dividedBy(state.allocations[i].subgraphDeployment.stakedTokens)
                    )
            );
          }
        }
      }
      return totalRewardsPerYear;
    },
    avgAPR: (state) => {
      return state.totalRewardsPerYear.dividedBy(state.totalAllocatedStake.plus(accountStore.availableStake));
    },
    calculatedClosingRewardsPerYear: (state) => {
      let totalRewardsPerYear = new BigNumber(0);
      if(state.selected.length > 0){
        for(const i in state.selected){
          let allocation = state.allocations.find((e) => e.id == state.selected[i]);
          totalRewardsPerYear = totalRewardsPerYear.plus(
              new BigNumber(allocation.subgraphDeployment.signalledTokens)
                  .dividedBy(networkStore.getTotalTokensSignalled)
                  .multipliedBy(networkStore.getIssuancePerYear)
                  .multipliedBy(
                      new BigNumber(allocation.allocatedTokens).dividedBy(allocation.subgraphDeployment.stakedTokens)
                  )
          );
        }
      }
      return totalRewardsPerYear;
    },
    calculatedClosingStake: (state) => {
      let totalAllocatedStake = new BigNumber(0);
      if(state.selected.length > 0){
        for(const i in state.selected){
          totalAllocatedStake = totalAllocatedStake.plus(state.allocations.find((e) => e.id == state.selected[i]).allocatedTokens);
        }
      }
      return totalAllocatedStake;
    },
    closingAvgAPR: (state) => {
      return state.calculatedClosingRewardsPerYear.dividedBy(state.calculatedClosingStake);
    },
    pendingRewardsCutSum: (state) => {
      return state.getPendingRewardsCuts.reduce((sum, cur) => cur.pendingRewardsCut ? sum.plus(cur.pendingRewardsCut): sum, new BigNumber(0));
    },
    pendingRewardsSum: (state) => {
      console.log("PENDING REWARDS");
      console.log(state.getPendingRewards);
      return state.getPendingRewards.reduce((sum, cur) => cur.pendingRewards.loaded ? sum.plus(cur.pendingRewards.value) : sum, new BigNumber(0));
    },
    dailyRewardsCutSum: (state) => {
      return state.getDailyRewardsCuts.reduce((sum, cur) => sum.plus(cur.dailyRewardsCut), new BigNumber(0));
    },
    dailyRewardsSum: (state) => {
      return state.getDailyRewards.reduce((sum, cur) => sum.plus(cur.dailyRewards), new BigNumber(0));
    }
  },
  actions: {
    async fetchAllPendingRewards(){
      for(let i = 0; i < this.allocations.length; i++){
        this.fetchPendingRewards(this.getAllocations[i].id);
      }
    },
    async fetchPendingRewards(allocationId){
      let allocation = this.getAllocations.find(e => e.id == allocationId);

      if(!allocation.pendingRewards.loading && !allocation.pendingRewards.loaded){

        allocation.pendingRewards.loading = true;

        chainStore.getRewardsContract.methods.getRewards(allocation.id).call(function(error, value){
          if(value === undefined)
            allocation.pendingRewards.error = true;
          else
            allocation.pendingRewards.value = BigNumber(value);
          
          allocation.pendingRewards.loaded = true;
          allocation.pendingRewards.loading = false;
        })
      }
    },
    async init(){
      if(!this.loaded && !this.loading)
        return this.fetchData();
    },
    async fetchData(){
      this.loading = true;
      networkStore.init().then(() => {
        this.fetch(0)
        .then((data) => {
          console.log(data);
          this.allocations = data.allocations;
          this.loaded = true;
          this.loading = false;
          this.pendingRewards = Array(data.allocations.length).fill();
          for(let i = 0; i < this.pendingRewards.length; i++){
            this.pendingRewards[i] = { value: BigNumber(0), loading: false, loaded: false };
          }
        })
      });
    },
    async fetch(skip){
      this.selected = [];
      console.log("Fetch " + skip);
      return chainStore.getNetworkSubgraphClient.query({
        query: gql`query allocations($indexer: String!, $skip: Int!){
          allocations(where: {activeForIndexer_contains_nocase: $indexer, status: Active}, orderBy:createdAtBlockNumber, orderDirection:desc, skip: $skip){
            id
            activeForIndexer{
              id
            }
            subgraphDeployment{
              versions(first:1, orderBy:version, orderDirection:desc){
                subgraph{
                  image
                  displayName
                }
              }
              ipfsHash
              createdAt
              originalName
              stakedTokens
              indexingRewardAmount
              signalledTokens
              queryFeesAmount
              deniedAt
            }
            allocatedTokens
            effectiveAllocation
            createdAt
            createdAtEpoch
            createdAtBlockHash
            createdAtBlockNumber
            indexingRewards
            indexingIndexerRewards
            indexingDelegatorRewards
          }
  
        }`,
        variables: {
          indexer: accountStore.getActiveAccount.address,
          skip: skip
        },
      })
      .then(({ data, networkStatus }) => {
        console.log(data);
        if(networkStatus == 7 && data.allocations.length == 100){
          return this.fetch(skip + data.allocations.length)
          .then((data1) => {
            console.log(data1);
            if(typeof data.allocations == "object" && typeof data1.allocations == "object")
              data.allocations = data.allocations.concat(data1.allocations);
            
            return data;
          })
        }
        return data;
      });
    }
  }
})
