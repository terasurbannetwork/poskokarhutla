import os
import sys

RAKUT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if RAKUT not in sys.path:
    sys.path.insert(0, RAKUT)
