module register_file(
    input  logic        clk,
    input  logic        reset,  // Added reset input
    input  logic        write_enable,
    input  logic [4:0]  rs1,
    input  logic [4:0]  rs2,
    input  logic [4:0]  rd,
    input  logic [31:0] write_data,
    output logic [31:0] read_data1,
    output logic [31:0] read_data2
);
    // 32 registers of 32 bits each
    logic [31:0] registers [31:0];
    
    // Initialize all registers to 0 on reset
    always_ff @(posedge clk or posedge reset) begin
        if (reset) begin
            for (int i = 0; i < 32; i++) begin
                registers[i] <= 32'h0;
            end
        end else if (write_enable && (rd != 0)) begin
            // Cannot write to register x0
            registers[rd] <= write_data;
        end
    end
    
    // Read operation is combinational
    assign read_data1 = (rs1 == 0) ? 32'h0 : registers[rs1];
    assign read_data2 = (rs2 == 0) ? 32'h0 : registers[rs2];
endmodule