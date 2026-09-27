from .base_adapter import BaseAdapter, NormalizedEntity, NormalizedTemporal, NormalizedRelationship, ProcessingResult
from .fir_adapter import ICDARFIRAdapter
from .communication_adapter import RealityMiningAdapter
from .location_adapter import GeoLifeAdapter
from .cctv_vehicle_adapter import UADETRACAdapter
from .cctv_person_adapter import MOTAdapter
from .financial_adapter import IEEECISAdapter

ADAPTERS = {
    "icdar_fir": ICDARFIRAdapter(),
    "reality_mining": RealityMiningAdapter(),
    "geolife": GeoLifeAdapter(),
    "uadetrac": UADETRACAdapter(),
    "mot_challenge": MOTAdapter(),
    "ieee_cis": IEEECISAdapter()
}

def get_adapter(dataset_id: str):
    return ADAPTERS.get(dataset_id)
