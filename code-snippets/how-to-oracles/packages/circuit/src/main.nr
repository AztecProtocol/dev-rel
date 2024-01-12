#[oracle(getSquared)]
unconstrained fn squared(input: [Field; 2]) -> [Field; 2] { }

unconstrained fn get_squared(input: [Field; 2]) -> [Field; 2] {
    squared(input)
}

fn main(input: [Field; 2], target: [Field; 2]) {
    let squared = get_squared(input);
    assert(squared == target);
}

#[test]
fn test_main() {
    let input = [1, 2];
    let target = [1, 4];
    main(input, target)
}

#[test(should_fail)]
fn test_fail() {
    let input = [1, 3];
    let target = [1, 4];
    main(input, target)
}
