`timescale 1ns / 1ps

module tb_riscv_processor_top();
    // Simulation inputs
    logic        CLK100MHZ;
    logic        BTNC;
    logic        BTNL;
    logic        BTNR;
    logic [15:0] SW;
    
    // Simulation outputs
    logic [7:0]  AN;
    logic [6:0]  A2G;
    
    // Instantiate the DUT with IS_SIMULATION=1
    riscv_processor_top #(.IS_SIMULATION(1)) dut(
        .CLK100MHZ(CLK100MHZ),
        .BTNC(BTNC),
        .BTNL(BTNL),
        .BTNR(BTNR),
        .SW(SW),
        .AN(AN),
        .A2G(A2G)
    );
    
    // Clock generation
    initial begin
        CLK100MHZ = 0;
        forever #5 CLK100MHZ = ~CLK100MHZ; // 100MHz clock (10ns period)
    end
    
    // Test sequence
    initial begin
        // Initialize inputs
        BTNC = 1;  // Start with reset active
        BTNL = 0;
        BTNR = 0;
        SW = 16'h0000;
        
        // Hold reset for multiple clock cycles
        repeat (5) @(posedge CLK100MHZ);
        #1; // Small delay after edge
        $display("Releasing reset");
        BTNC = 0;  // Release reset
        
        // Wait for program execution
        $display("Start executing instructions from program.dat");
        
        // Monitor execution for 200 clock cycles (increased from 100)
        repeat (200) @(posedge CLK100MHZ);
        
        // Print final results
        $display("\nFinal Execution Results:");
        for (int i = 1; i <= 18; i++) begin
            $display("Register x%0d = %d", i, dut.core.reg_file.registers[i]);
        end
        
        // Print memory contents
        $display("\nMemory Contents (first 10 words):");
        for (int i = 0; i < 10; i++) begin
            $display("Memory[%0d] = %h", i*4, dut.dmem.mem[i]);
        end
        
        $finish;
    end
    
    // Print instruction memory content
    initial begin
        $display("Instruction Memory Content Verification:");
        for (int i = 0; i < 23; i++) begin
            $display("mem[%0d] = %h", i, dut.imem.mem[i]);
        end
    end
    
    // Monitor register values - expanded to show more registers
    integer cycle_count = 0;
    always @(posedge CLK100MHZ) begin
        cycle_count = cycle_count + 1;
        if (cycle_count % 2 == 0) begin  // Print every 2 cycles
            $display("Cycle=%0d: PC=%h, Instr=%h, x1=%d, x2=%d, x3=%d, x4=%d, x5=%d, x6=%d, x7=%d, x8=%d, x9=%d, x10=%d, x11=%d, x12=%d, x13=%d, x14=%d, x18=%d", 
                     cycle_count, 
                     dut.instr_addr, 
                     dut.instr, 
                     dut.core.reg_file.registers[1], 
                     dut.core.reg_file.registers[2], 
                     dut.core.reg_file.registers[3], 
                     dut.core.reg_file.registers[4],
                     dut.core.reg_file.registers[5],
                     dut.core.reg_file.registers[6],
                     dut.core.reg_file.registers[7],
                     dut.core.reg_file.registers[8],
                     dut.core.reg_file.registers[9],
                     dut.core.reg_file.registers[10],
                     dut.core.reg_file.registers[11],
                     dut.core.reg_file.registers[12],
                     dut.core.reg_file.registers[13],
                     dut.core.reg_file.registers[14],
                     dut.core.reg_file.registers[18]);
        end
    end
endmodule