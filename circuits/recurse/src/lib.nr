use dep::std;
use dep::simple;

#[export]
fn main_call(x: Field, y: Field) -> bool {
    let mut res = simple::not_odd(x);
    res &= simple::not_odd(y);
    res &= simple::not_equal(x, y);
    res
}

// #[recursive]
// #[export]
// fn main(x: Field, y: Field) -> pub bool {}

#[test]
fn test_not_equal() {
    assert(main_call(2, 4));
    // Uncomment to make test fail
    // assert(not_equal(1, 1));
}
