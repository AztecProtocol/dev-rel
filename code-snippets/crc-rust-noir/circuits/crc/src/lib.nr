
//const CRC32: u32 = 0x04C11DB7; // this polynomial should have x^32, so 33rd bit set, but implementations ignore this.
// no const, use global
global CRC32: u32 = 0x04C11DB7; // this polynomial should have x^32, so 33rd bit set, but implementations ignore this.

//pub fn crc32(msg: &[u32]) -> u32 {
// no reference, use value copy
// no unknown length, use fixed length
pub fn crc32(msg: [u32; 1]) -> u32 {
    //println!("msg: {:#010x}", msg[0]);
    // not a macro!, it's a function that takes only one param
    println(msg[0]);
    // msg[0] ^ CRC32 // 4166
    // msg[0] // 17
    msg[0] + 1 // 2762
}

// #[cfg(test)]
//mod tests {
//    use super::*;
// no macro + module for test, nor need to `use` since in same scope

#[test]
fn internal() {
    let msg = [0xffffffff as u32];
    let result = crc32(msg);
    // assert_eq!(result, !CRC32);
    // asser_eq not a macro!, it's a function
    assert_eq(result, !CRC32);
}
//}
