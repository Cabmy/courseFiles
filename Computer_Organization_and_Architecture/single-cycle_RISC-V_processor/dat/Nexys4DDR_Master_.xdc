# Nexys4 DDRԼ���ļ�
set_property -dict { PACKAGE_PIN E3    IOSTANDARD LVCMOS33 } [get_ports { CLK100MHZ }]; #IO_L12P_T1_MRCC_35 Sch=clk100mhz
create_clock -add -name sys_clk_pin -period 10.00 -waveform {0 5} [get_ports {CLK100MHZ}];

# ��ť
set_property -dict { PACKAGE_PIN N17 IOSTANDARD LVCMOS33 } [get_ports BTNC];
set_property -dict { PACKAGE_PIN P17 IOSTANDARD LVCMOS33 } [get_ports BTNL];
set_property -dict { PACKAGE_PIN M17 IOSTANDARD LVCMOS33 } [get_ports BTNR];

# ���� (ʹ��ǰ8λ)
set_property -dict { PACKAGE_PIN J15   IOSTANDARD LVCMOS33 } [get_ports { SW[0] }]; #IO_L24N_T3_RS0_15 Sch=sw[0]
set_property -dict { PACKAGE_PIN L16   IOSTANDARD LVCMOS33 } [get_ports { SW[1] }]; #IO_L3N_T0_DQS_EMCCLK_14 Sch=sw[1]
set_property -dict { PACKAGE_PIN M13   IOSTANDARD LVCMOS33 } [get_ports { SW[2] }]; #IO_L6N_T0_D08_VREF_14 Sch=sw[2]
set_property -dict { PACKAGE_PIN R15   IOSTANDARD LVCMOS33 } [get_ports { SW[3] }]; #IO_L13N_T2_MRCC_14 Sch=sw[3]
set_property -dict { PACKAGE_PIN R17   IOSTANDARD LVCMOS33 } [get_ports { SW[4] }]; #IO_L12N_T1_MRCC_14 Sch=sw[4]
set_property -dict { PACKAGE_PIN T18   IOSTANDARD LVCMOS33 } [get_ports { SW[5] }]; #IO_L7N_T1_D10_14 Sch=sw[5]
set_property -dict { PACKAGE_PIN U18   IOSTANDARD LVCMOS33 } [get_ports { SW[6] }]; #IO_L17N_T2_A13_D29_14 Sch=sw[6]
set_property -dict { PACKAGE_PIN R13   IOSTANDARD LVCMOS33 } [get_ports { SW[7] }]; #IO_L5N_T0_D07_14 Sch=sw[7]
set_property -dict { PACKAGE_PIN T8    IOSTANDARD LVCMOS18 } [get_ports { SW[8] }]; #IO_L24N_T3_34 Sch=sw[8]
set_property -dict { PACKAGE_PIN U8    IOSTANDARD LVCMOS18 } [get_ports { SW[9] }]; #IO_25_34 Sch=sw[9]
set_property -dict { PACKAGE_PIN R16   IOSTANDARD LVCMOS33 } [get_ports { SW[10] }]; #IO_L15P_T2_DQS_RDWR_B_14 Sch=sw[10]
set_property -dict { PACKAGE_PIN T13   IOSTANDARD LVCMOS33 } [get_ports { SW[11] }]; #IO_L23P_T3_A03_D19_14 Sch=sw[11]
set_property -dict { PACKAGE_PIN H6    IOSTANDARD LVCMOS33 } [get_ports { SW[12] }]; #IO_L24P_T3_35 Sch=sw[12]
set_property -dict { PACKAGE_PIN U12   IOSTANDARD LVCMOS33 } [get_ports { SW[13] }]; #IO_L20P_T3_A08_D24_14 Sch=sw[13]
set_property -dict { PACKAGE_PIN U11   IOSTANDARD LVCMOS33 } [get_ports { SW[14] }]; #IO_L19N_T3_A09_D25_VREF_14 Sch=sw[14]
set_property -dict { PACKAGE_PIN V10   IOSTANDARD LVCMOS33 } [get_ports { SW[15] }]; #IO_L21P_T3_DQS_14 Sch=sw[15]

# LEDs
set_property -dict { PACKAGE_PIN H17 IOSTANDARD LVCMOS33 } [get_ports { LED[0] }];
set_property -dict { PACKAGE_PIN K15 IOSTANDARD LVCMOS33 } [get_ports { LED[1] }];
set_property -dict { PACKAGE_PIN J13 IOSTANDARD LVCMOS33 } [get_ports { LED[2] }];
set_property -dict { PACKAGE_PIN N14 IOSTANDARD LVCMOS33 } [get_ports { LED[3] }];
set_property -dict { PACKAGE_PIN R18 IOSTANDARD LVCMOS33 } [get_ports { LED[4] }];
set_property -dict { PACKAGE_PIN V17 IOSTANDARD LVCMOS33 } [get_ports { LED[5] }];
set_property -dict { PACKAGE_PIN U17 IOSTANDARD LVCMOS33 } [get_ports { LED[6] }];
set_property -dict { PACKAGE_PIN U16 IOSTANDARD LVCMOS33 } [get_ports { LED[7] }];
set_property -dict { PACKAGE_PIN V16 IOSTANDARD LVCMOS33 } [get_ports { LED[8] }];
set_property -dict { PACKAGE_PIN T15 IOSTANDARD LVCMOS33 } [get_ports { LED[9] }];
set_property -dict { PACKAGE_PIN U14 IOSTANDARD LVCMOS33 } [get_ports { LED[10] }];
set_property -dict { PACKAGE_PIN T16 IOSTANDARD LVCMOS33 } [get_ports { LED[11] }];
set_property -dict { PACKAGE_PIN V15 IOSTANDARD LVCMOS33 } [get_ports { LED[12] }];
set_property -dict { PACKAGE_PIN V14 IOSTANDARD LVCMOS33 } [get_ports { LED[13] }];
set_property -dict { PACKAGE_PIN V12 IOSTANDARD LVCMOS33 } [get_ports { LED[14] }];
set_property -dict { PACKAGE_PIN V11 IOSTANDARD LVCMOS33 } [get_ports { LED[15] }];

# �߶������
set_property -dict { PACKAGE_PIN T10 IOSTANDARD LVCMOS33 } [get_ports {A2G[6]}];
set_property -dict { PACKAGE_PIN R10 IOSTANDARD LVCMOS33 } [get_ports {A2G[5]}];
set_property -dict { PACKAGE_PIN K16 IOSTANDARD LVCMOS33 } [get_ports {A2G[4]}];
set_property -dict { PACKAGE_PIN K13 IOSTANDARD LVCMOS33 } [get_ports {A2G[3]}];
set_property -dict { PACKAGE_PIN P15 IOSTANDARD LVCMOS33 } [get_ports {A2G[2]}];
set_property -dict { PACKAGE_PIN T11 IOSTANDARD LVCMOS33 } [get_ports {A2G[1]}];
set_property -dict { PACKAGE_PIN L18 IOSTANDARD LVCMOS33 } [get_ports {A2G[0]}];

set_property -dict { PACKAGE_PIN J17 IOSTANDARD LVCMOS33 } [get_ports {AN[0]}];
set_property -dict { PACKAGE_PIN J18 IOSTANDARD LVCMOS33 } [get_ports {AN[1]}];
set_property -dict { PACKAGE_PIN T9 IOSTANDARD LVCMOS33 } [get_ports {AN[2]}];
set_property -dict { PACKAGE_PIN J14 IOSTANDARD LVCMOS33 } [get_ports {AN[3]}];
set_property -dict { PACKAGE_PIN P14 IOSTANDARD LVCMOS33 } [get_ports {AN[4]}];
set_property -dict { PACKAGE_PIN T14 IOSTANDARD LVCMOS33 } [get_ports {AN[5]}];
set_property -dict { PACKAGE_PIN K2 IOSTANDARD LVCMOS33 } [get_ports {AN[6]}];
set_property -dict { PACKAGE_PIN U13 IOSTANDARD LVCMOS33 } [get_ports {AN[7]}];
