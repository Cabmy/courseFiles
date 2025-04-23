module data_memory(
    input  logic        clk,
    input  logic [31:0] addr,
    input  logic        write_enable,
    input  logic        read_enable,
    input  logic [31:0] write_data,
    output logic [31:0] read_data
);
    // Data memory (RAM)
    logic [31:0] mem [255:0];  // 1KB data memory
    
    // Read operation
    assign read_data = read_enable ? mem[addr[9:2]] : 32'h0;
    
    // Write operation
    always_ff @(posedge clk) begin
        if (write_enable)
            mem[addr[9:2]] <= write_data;
    end
endmodule