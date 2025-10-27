from shortener.utils import batch_generate_codes, generate_code


def test_generate_code_length_and_charset():
    code = generate_code(7)
    assert len(code) == 7
    assert code.isalnum()


def test_batch_generate_codes_uniqueness():
    codes = batch_generate_codes(6, 200)
    assert len(codes) == 200
    assert all(code.isalnum() for code in codes)
