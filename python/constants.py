# 8 bits combinatory logic (match src/constants.js)

# bytes per number (1, 2, 4, 8)
I8 = 1 << 0   # 0x01
I16 = 1 << 1  # 0x02
I32 = 1 << 2  # 0x04
F64 = 1 << 3  # 0x08

# bytes per uint (1, 2, 4, 8)
U8 = I16 | I8       # 0x03
U16 = I32 | I16     # 0x06
U32 = I32 | I16 | I8  # 0x07

# bytes per Big(U)Int
BI = F64 | I32 | I8   # 0x0D
BUI = F64 | I32 | I16  # 0x0E

LEN = I8 | I16 | I32 | F64  # 0x0F

# primitives
FALSE = 0
TRUE = 1 << 0   # 0x01
NULL = 1 << 1   # 0x02

# complex
OBJECT = 1 << 4   # 0x10
ARRAY = 1 << 5    # 0x20
STRING = 1 << 6   # 0x40
NUMBER = 1 << 7   # 0x80

# VIEW = ARRAY | NUMBER  # 0xA0
RECURSION = ARRAY | OBJECT | STRING  # 0x70
CUSTOM = (RECURSION | NUMBER | LEN) & ~I8  # 0xFE
CUSTOM_REVIVE = CUSTOM | I8  # 0xFF

MAX_U8 = 2 ** 8
MAX_U16 = 2 ** 16
MAX_U32 = 2 ** 32
MAX_I8 = MAX_U8 // 2
MAX_I16 = MAX_U16 // 2
MAX_I32 = MAX_U32 // 2
