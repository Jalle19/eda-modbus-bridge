# Connecting to an Enervent unit

There are two ways to communicate with your ventilation unit:

* Modbus RTU
* Modbus TCP

If your ventilation unit has an RJ45 port you can use Modbus TCP. Connect the unit to your local network and take note 
of what IP address it has.

If your ventilation unit does not have an RJ45 port (very common), read on. The rest of this document focuses on how
to communicate using Modbus RTU.

These instructions are based on:

* https://doc.enervent.com/op/op.ViewOnline.php?documentid=999&version=1 (Freeway WEB-väyläsovitin - Asennus- ja käyttöohjeet)
* https://web.archive.org/web/20201020102005/http://ala-paavola.fi/jaakko/doku.php?id=pingvin

Please read the above documents before continuing!

## Requirements

* A 4P4C cable (sometimes called RJ10)
* An RS-485 device

## Instructions

1. Cut the 4P4C cable
2. Connect the red and green wires to your RS-485 device, according to this scheme:
 
| PIN | Color | Signal  |
|-----|-------|---------|
| 1   | Black | +5VDC   |
| 2   | Red   | Data +  |
| 3   | Green | Data -  |
| 4   | Yellow | Ground |

If your RS-485 device has a ground terminal, connect the yellow wire to that.

3. Connect the 4P4C connector to the Freeway port on the Enervent computer board.

## Troubleshooting

If you have connected everything but the software is unable to read anything from the ventilation unit (usually 
manifests as various timeouts), try the following:

* try reversing the A and B (sometimes called RX and TX or + and -)
* verify that you're using the correct slave address by looking up the "Modbus address" from the control panel (see 
  manual for password)
* if your unit is set to use slave address 0, change it to 1. The address 0 has special meaning and should not be used.
