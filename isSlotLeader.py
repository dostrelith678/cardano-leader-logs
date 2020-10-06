# Thanks to Papacarp [LOVE] and others who contributed.

import math
import binascii
import hashlib
import pytz
import argparse

from datetime import datetime, timezone
from ctypes import *

parser = argparse.ArgumentParser(description="Calculate the leadership log.")
parser.add_argument('--epoch-length',       type=int,   dest='epochLength', help='the epoch length [e.g. 432000]', required=True)
parser.add_argument('--first-slot-of-epoch',type=int,   dest='fslot',       help='the first slot of the epoch', required=True)
parser.add_argument('--epoch-nonce',                    dest='eta0',        help='the epoch nonce to check', required=True)
parser.add_argument('--vrf-skey',                       dest='skey',        help='provide the path to the pool.vrf.skey file', required=True)
parser.add_argument('--sigma',              type=float, dest='sigma',       help='the controlled stake sigma value of the pool (e.g. 0.0034052348379780869', required=True)
parser.add_argument('--d',                  type=float, dest='d',           help='the decentralizationParam param d', required=True)
parser.add_argument('--active-slots-coeff', type=float, dest='activeSlotsCoeff', help='the activeSlotsCoeff [e.g. 0.05]', required=True)
parser.add_argument('--libsodium-binary',               dest='libsodiumBin',help='the path to libsodium', required=True)

args = parser.parse_args()

epochLength           = args.epochLength
activeSlotsCoeff      = args.activeSlotsCoeff
firstSlotOfEpoch      = args.fslot
sigma                 = args.sigma
eta0                  = args.eta0
poolVrfSkey           = args.skey
decentralizationParam = args.d

slotcount             = 0
local_tz              = pytz.timezone('Europe/Berlin') # use your local timezone name here

# Bindings are not avaliable so using ctypes to just force it in for now.
libsodium = cdll.LoadLibrary(args.libsodiumBin)
libsodium.sodium_init()

def mkSeed(slot, eta0):

    h = hashlib.blake2b(digest_size=32)
    h.update(bytearray([0,0,0,0,0,0,0,1])) #neutral nonce
    seedLbytes=h.digest()

    h = hashlib.blake2b(digest_size=32)
    h.update(slot.to_bytes(8,byteorder='big') + binascii.unhexlify(eta0))
    slotToSeedBytes = h.digest()

    seed = [x ^ slotToSeedBytes[i] for i,x in enumerate(seedLbytes)]

    return bytes(seed)

def vrfEvalCertified(seed, tpraosCanBeLeaderSignKeyVRF):
    if isinstance(seed, bytes) and isinstance(tpraosCanBeLeaderSignKeyVRF, bytes):
        proof = create_string_buffer(libsodium.crypto_vrf_ietfdraft03_proofbytes())

        libsodium.crypto_vrf_prove(proof, tpraosCanBeLeaderSignKeyVRF,seed, len(seed))

        proofHash = create_string_buffer(libsodium.crypto_vrf_outputbytes())

        libsodium.crypto_vrf_proof_to_hash(proofHash,proof)

        return proofHash.raw

    else:
        print("error.  Feed me bytes")
        exit()

def isOverlaySlot(firstSlotOfEpoch, currentSlot, decentralizationParam):
   diff_slot = float(currentSlot - firstSlotOfEpoch)
   if math.ceil( diff_slot * decentralizationParam ) < math.ceil( (diff_slot + 1) * decentralizationParam ):
      return True
   return False

# Determine if our pool is a slot leader for this given slot
# @param slot The slot to check
# @param activeSlotsCoeff The activeSlotsCoeff value from protocol params
# @param sigma The controlled stake proportion for the pool
# @param eta0 The epoch nonce value
# @param poolVrfSkey The vrf signing key for the pool

def isSlotLeader(slot, activeSlotsCoeff, sigma, eta0, poolVrfSkey):
    seed = mkSeed(slot, eta0)
    tpraosCanBeLeaderSignKeyVRFb = binascii.unhexlify(poolVrfSkey)
    cert=vrfEvalCertified(seed,tpraosCanBeLeaderSignKeyVRFb)
    certNat  = int.from_bytes(cert, byteorder="big", signed=False)
    certNatMax = math.pow(2,512)
    denominator = certNatMax - certNat
    q = certNatMax / denominator
    c = math.log(1.0 - activeSlotsCoeff)
    sigmaOfF = math.exp(-sigma * c)
    return q <= sigmaOfF

for slot in range(firstSlotOfEpoch,epochLength+firstSlotOfEpoch):
    if isOverlaySlot(firstSlotOfEpoch,slot,decentralizationParam):
        continue

    slotLeader = isSlotLeader(slot,activeSlotsCoeff,sigma,eta0,poolVrfSkey)

    if slotLeader:
        slotcount+=1
        timestamp = datetime.fromtimestamp(slot + 1591566291, tz=local_tz)
        print(timestamp.strftime('%Y-%m-%d %H:%M:%S') + " ==> Leader for slot " +str(slot-firstSlotOfEpoch) + ", Cumulative epoch blocks: " + str(slotcount))


