TARGET = prog
LIBS = -lm

CC = emcc -O3 -s NO_FILESYSTEM=1 -s 'EXPORTED_RUNTIME_METHODS=["ccall", "cwrap"]' -s TOTAL_MEMORY=67108864 -s EXPORTED_FUNCTIONS="['_hash_cn']" -s WASM=1 -s ENVIRONMENT=worker -s MODULARIZE=1 -sWASM_BIGINT -s EXPORT_ES6=1 --no-entry --pre-js ../../../wasm-pre.js
CFLAGS = 

# -s ASSERTIONS=1
#  -s SINGLE_FILE=1
.PHONY: default all clean

default: $(TARGET)
all: default

OBJECTS = $(patsubst %.c, %.o, $(wildcard *.c))
HEADERS = $(wildcard *.h)

%.o: %.c $(HEADERS) $(CC) $(CFLAGS) -c $< -o $@

.PRECIOUS: $(TARGET) $(OBJECTS)

$(TARGET): $(OBJECTS)
	$(CC) $(OBJECTS) -Wall $(LIBS) -o cn.js

clean:
	-rm -f *.o
	-rm -f $(TARGET)
