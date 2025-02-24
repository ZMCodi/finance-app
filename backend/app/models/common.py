from pydantic import BaseModel, Field
from typing import List, Dict

class PlotJSON(BaseModel):
    data: List[Dict] = Field(..., title='Data', description='The data for the plot')
    layout: Dict = Field(..., title='Layout', description='The layout for the plot')
