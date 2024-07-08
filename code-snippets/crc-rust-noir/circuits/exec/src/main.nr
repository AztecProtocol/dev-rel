use dep::crc;

pub fn main(param: u32) {
    let res = crc::crc32([param]);
    println(res);
    assert_eq(res, 0xffffffff);
}
