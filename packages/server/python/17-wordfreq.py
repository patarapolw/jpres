from wordfreq import word_frequency
import sys

for line in sys.stdin:
  line = line.strip()
  f = word_frequency(line, "ja") * 10 ** 6

  if f:
    print(line + "=" + str(f))
