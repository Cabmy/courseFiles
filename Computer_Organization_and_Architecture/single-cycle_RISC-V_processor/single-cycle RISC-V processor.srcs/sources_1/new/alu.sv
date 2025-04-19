module alu(
    input  logic [31:0] operand1,
    input  logic [31:0] operand2,
    input  logic [3:0]  alu_ctrl,
    output logic [31:0] result,
    output logic        zero
);
    // ALU control codes
    localparam ALU_ADD = 4'b0000;
    localparam ALU_SUB = 4'b0001;
    localparam ALU_AND = 4'b0010;
    localparam ALU_OR  = 4'b0011;
    localparam ALU_SLT = 4'b0100;
    
    always_comb begin
        case (alu_ctrl)
            ALU_ADD: result = operand1 + operand2;
            ALU_SUB: result = operand1 - operand2;
            ALU_AND: result = operand1 & operand2;
            ALU_OR:  result = operand1 | operand2;
            ALU_SLT: result = ($signed(operand1) < $signed(operand2)) ? 32'h1 : 32'h0;
            default: result = 32'h0;
        endcase
    end
    
    assign zero = (result == 32'h0);
endmodule