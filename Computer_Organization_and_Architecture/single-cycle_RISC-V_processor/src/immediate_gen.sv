module immediate_gen(
    input  logic [31:0] instr,
    output logic [31:0] imm_ext
);
    logic [6:0] opcode;
    assign opcode = instr[6:0];
    
    always_comb begin
        case (opcode)
            7'b0010011,  // I-type (addi, andi, ori, slti)
            7'b0000011:  // Load (lw)
                imm_ext = {{20{instr[31]}}, instr[31:20]};  // Sign-extended 12-bit immediate
                
            7'b0100011:  // Store (sw)
                imm_ext = {{20{instr[31]}}, instr[31:25], instr[11:7]};  // Sign-extended store immediate
                
            7'b1100011:  // Branch (beq, bne)
                imm_ext = {{19{instr[31]}}, instr[31], instr[7], instr[30:25], instr[11:8], 1'b0};  // Sign-extended branch offset
                
            7'b1101111:  // JAL (j)
                imm_ext = {{11{instr[31]}}, instr[31], instr[19:12], instr[20], instr[30:21], 1'b0};  // Sign-extended jump offset
            
            7'b1100111:  // JALR
                imm_ext = {{20{instr[31]}}, instr[31:20]};  // Sign-extended 12-bit immediate
                
            default:
                imm_ext = 32'h0;  // Default to 0 for R-type and others
        endcase
    end
endmodule