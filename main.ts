import { CompiledCircuit } from '@noir-lang/types';
import { not_equal, not_odd, main_call, main } from './codegen';
import { setTimeout } from "timers/promises";


async function start() {
  let res = await main_call("02", "04");
  console.log(res);
}

start();
