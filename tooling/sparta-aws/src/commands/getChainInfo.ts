import { SlashCommandBuilder } from '@discordjs/builders';
import { ChainInfoService } from '../services/chaininfo-service.js';

export const getChainInfo = {
  data: new SlashCommandBuilder()
    .setName('get-info')
    .setDescription('Get chain info'),

  async execute(interaction: any) {
    try {
      const {
        pendingBlockNum,
        provenBlockNum,
        currentEpoch,
        currentSlot,
        proposerNow,
      } = await ChainInfoService.getInfo();

      return {
        type: 4,
        data: {
          content: `Pending block: ${pendingBlockNum}\nProven block: ${provenBlockNum}\nCurrent epoch: ${currentEpoch}\nCurrent slot: ${currentSlot}\nProposer now: ${proposerNow}`,
          flags: 64
        }
      };
    } catch (error) {
      console.error('Error in get-info command:', error);
      return {
        type: 4,
        data: {
          content: 'Failed to get chain info',
          flags: 64
        }
      };
    }
  },
}; 
