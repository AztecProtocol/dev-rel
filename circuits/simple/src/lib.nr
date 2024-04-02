#[export]
pub fn not_equal(x: Field, y: Field) -> bool {
    x != y
}

#[export]
pub fn not_odd(x: Field) -> bool {
    !(((x as u8) & 1) as bool)
}

#[test]
fn test_not_equal() {
    assert(not_equal(1, 2));
    // Uncomment to make test fail
    // assert(not_equal(1, 1));
}

fn test_not_odd() {
    assert(not_odd(2));
    // Uncomment to make test fail
    // assert(not_equal(1, 1));
}
