#pragma once

#include "printersdk.h"
#include <functional>

PRINTER_API int CALL_STACK SearchEscNetDevice(int revTimeout, std::function<void(unsigned char*)> callback);
PRINTER_API int CALL_STACK SetEscNetInfo(unsigned char* mac, unsigned char* ipAddress, unsigned char* mask, unsigned char* gateway, unsigned char dhcp);