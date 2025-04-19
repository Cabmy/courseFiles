module instr_memory(
    input  logic [31:0] addr,
    output logic [31:0] instr
);
    // Instruction memory (ROM)
    logic [31:0] mem [255:0];  // 1KB instruction memory
    
    // Initialize with test program
    initial begin
        // Default initialization to NOP instructions
        for(int i = 0; i < 256; i++) begin
            mem[i] = 32'h00000013;  // NOP instruction (addi x0, x0, 0)
        end
        
        // Attempt to read from file
        $readmemh("program.dat", mem);
    end
    
    // Word-aligned access, divide address by 4
    assign instr = mem[addr[31:2]];  // Address divided by 4
endmodule