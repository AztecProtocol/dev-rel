// const CRC3: u32 = 0b1011; // x^3 + x + 1
pub const CRC32: u32 = 0x04C11DB7; // this polynomial should have x^32, so 33rd bit set, but implementations ignore this.

pub fn crc32(msg: &[u32]) -> u32 {
    println!("msg: {:#010x}", msg[0]);
    msg[0] ^ CRC32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn internal() {
        let msg = [0xffffffff];
        let result = crc32(&msg);
        assert_eq!(result, !CRC32);
    }
}
