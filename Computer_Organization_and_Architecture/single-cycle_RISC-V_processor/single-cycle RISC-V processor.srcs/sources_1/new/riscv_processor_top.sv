module riscv_processor_top(
    input  logic        CLK100MHZ,  // 100MHz clock from board
    input  logic        BTNC,       // Center button - system reset
    input  logic        BTNL,       // Left button 
    input  logic        BTNR,       // Right button
    input  logic [15:0] SW,         // Switches - binary input
    output logic [15:0] LED,        // Added LED outputs
    output logic [7:0]  AN,         // 7-segment display anodes
    output logic [6:0]  A2G         // 7-segment display cathodes
);

    // Parameter for simulation
    parameter IS_SIMULATION = 0;
    
    // Clock and reset signals
    logic cpu_clk;
    logic reset;
    
    // Connect LEDs directly to switches for debugging
    assign LED = SW;
    
    // For simulation mode
    generate
        if (IS_SIMULATION) begin: sim_mode
            // For simulation, use the direct clock and reset
            assign cpu_clk = CLK100MHZ;
            assign reset = BTNC;
        end else begin: hw_mode
            // For hardware, use the clock divider
            logic clk_div_out;
            clock_divider clk_div(
                .clk_in(CLK100MHZ),
                .reset(BTNC),
                .clk_out(clk_div_out)
            );
            assign cpu_clk = clk_div_out;
            
            // Debounced reset
            logic btnc_debounced;
            debounce db_btnc(.clk(CLK100MHZ), .btn_in(BTNC), .btn_out(btnc_debounced));
            assign reset = btnc_debounced;
        end
    endgenerate

    // Button processing
    logic btnl_debounced, btnr_debounced;
    logic btnl_pulse, btnr_pulse;
    
    generate
        if (IS_SIMULATION) begin: sim_buttons
            // For simulation, direct button connections
            assign btnl_pulse = BTNL;
            assign btnr_pulse = BTNR;
        end else begin: hw_buttons
            // For hardware, debounce the buttons
            debounce db_btnl(.clk(CLK100MHZ), .btn_in(BTNL), .btn_out(btnl_debounced));
            debounce db_btnr(.clk(CLK100MHZ), .btn_in(BTNR), .btn_out(btnr_debounced));
            
            edge_detector ed_btnl(.clk(CLK100MHZ), .signal_in(btnl_debounced), .pulse(btnl_pulse));
            edge_detector ed_btnr(.clk(CLK100MHZ), .signal_in(btnr_debounced), .pulse(btnr_pulse));
        end
    endgenerate

    // Processor signals
    logic [31:0] instr;
    logic [31:0] instr_addr;
    logic [31:0] mem_addr;
    logic [31:0] mem_write_data;
    logic [31:0] mem_read_data;
    logic mem_read_enable;
    logic mem_write_enable;

    // RISC-V core
    riscv_core core(
        .clk(cpu_clk),
        .reset(reset),
        .instr(instr),
        .instr_addr(instr_addr),
        .mem_addr(mem_addr),
        .mem_write_data(mem_write_data),
        .mem_read_data(mem_read_data),
        .mem_read_enable(mem_read_enable),
        .mem_write_enable(mem_write_enable)
    );
    
    // Instruction memory
    instr_memory imem(
        .addr(instr_addr),
        .instr(instr)
    );
    
    // Data memory
    data_memory dmem(
        .clk(cpu_clk),
        .addr(mem_addr),
        .write_enable(mem_write_enable),
        .read_enable(mem_read_enable),
        .write_data(mem_write_data),
        .read_data(mem_read_data)
    );
    
    // I/O Interface
    logic [9:0] operand1, operand2;
    logic [19:0] io_result;
    logic display_enable;
    
    io_interface io(
        .clk(CLK100MHZ),  // Use faster clock for better responsiveness
        .reset(reset),
        .btnl(btnl_pulse),
        .btnr(btnr_pulse),
        .switches(SW),
        .operand1(operand1),
        .operand2(operand2),
        .result(io_result),
        .display_enable(display_enable)
    );
    
    // Result selection
    logic [19:0] processor_result;
    assign processor_result = {4'b0000, core.reg_file.registers[3][15:0]};
    
    logic [19:0] display_result;
    logic actual_display_enable;
    
    generate
        if (IS_SIMULATION) begin: sim_display
            assign display_result = processor_result;
            assign actual_display_enable = 1'b1;
        end else begin: hw_display
            assign display_result = io_result;
            assign actual_display_enable = display_enable;  // Use the proper display enable signal
        end
    endgenerate
    
    // Display controller
    display_controller disp(
        .clk(CLK100MHZ),  // Using faster clock for display refresh
        .reset(reset),
        .operand1(operand1),
        .operand2(operand2),
        .result(display_result),
        .display_enable(actual_display_enable),
        .AN(AN),
        .A2G(A2G)
    );
endmodule