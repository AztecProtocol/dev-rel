use app::*;

#[test]
fn outer_test() {
    let msg = [0xffffffff];
    let result = crc32(&msg);
    assert_eq!(result, !CRC32);
}