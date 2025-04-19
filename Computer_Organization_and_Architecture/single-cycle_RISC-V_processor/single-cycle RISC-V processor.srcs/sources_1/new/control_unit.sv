module control_unit(
    input  logic [6:0] opcode,
    input  logic [2:0] funct3,
    input  logic [6:0] funct7,
    output logic       reg_write,
    output logic       alu_src,
    output logic       mem_to_reg,
    output logic       mem_read,
    output logic       mem_write,
    output logic       branch,
    output logic       jump,
    output logic [3:0] alu_ctrl
);
    // RISC-V opcode definitions
    localparam R_TYPE    = 7'b0110011;  // R-type instructions (add, sub, and, or, slt)
    localparam I_TYPE    = 7'b0010011;  // I-type instructions (addi, andi, ori, slti)
    localparam LOAD      = 7'b0000011;  // Load instructions (lw)
    localparam STORE     = 7'b0100011;  // Store instructions (sw)
    localparam BRANCH    = 7'b1100011;  // Branch instructions (beq, bne)
    localparam JAL       = 7'b1101111;  // Jump and link instruction (jal)
    localparam JALR      = 7'b1100111;  // Jump and link register instruction (jalr)
    localparam NOP       = 7'b0000000;  // No operation
    
    // ALU control codes
    localparam ALU_ADD   = 4'b0000;
    localparam ALU_SUB   = 4'b0001;
    localparam ALU_AND   = 4'b0010;
    localparam ALU_OR    = 4'b0011;
    localparam ALU_SLT   = 4'b0100;
    
    always_comb begin
        // Default values
        reg_write  = 1'b0;
        alu_src    = 1'b0;
        mem_to_reg = 1'b0;
        mem_read   = 1'b0;
        mem_write  = 1'b0;
        branch     = 1'b0;
        jump       = 1'b0;
        alu_ctrl   = ALU_ADD;
        
        case (opcode)
            R_TYPE: begin  // R-type instructions
                reg_write = 1'b1;
                alu_src   = 1'b0;
                
                case (funct3)
                    3'b000: alu_ctrl = (funct7 == 7'b0100000) ? ALU_SUB : ALU_ADD;  // sub / add
                    3'b111: alu_ctrl = ALU_AND;  // and
                    3'b110: alu_ctrl = ALU_OR;   // or
                    3'b010: alu_ctrl = ALU_SLT;  // slt
                    default: alu_ctrl = ALU_ADD;
                endcase
            end
            
            I_TYPE: begin  // I-type instructions
                reg_write = 1'b1;
                alu_src   = 1'b1;
                
                case (funct3)
                    3'b000: alu_ctrl = ALU_ADD;  // addi
                    3'b111: alu_ctrl = ALU_AND;  // andi
                    3'b110: alu_ctrl = ALU_OR;   // ori
                    3'b010: alu_ctrl = ALU_SLT;  // slti
                    default: alu_ctrl = ALU_ADD;
                endcase
            end
            
            LOAD: begin  // Load word
                reg_write  = 1'b1;
                alu_src    = 1'b1;
                mem_to_reg = 1'b1;
                mem_read   = 1'b1;
                alu_ctrl   = ALU_ADD;
            end
            
            STORE: begin  // Store word
                alu_src   = 1'b1;
                mem_write = 1'b1;
                alu_ctrl  = ALU_ADD;
            end
            
            BRANCH: begin  // Branch instructions
                branch   = 1'b1;
                alu_src  = 1'b0;
                
                case (funct3)
                    3'b000: alu_ctrl = ALU_SUB;  // beq - subtract and check if zero
                    3'b001: alu_ctrl = ALU_SUB;  // bne - subtract and check if not zero 
                    default: alu_ctrl = ALU_SUB;
                endcase
            end
            
            JAL: begin  // Jump and link instruction
                reg_write = 1'b1;
                jump      = 1'b1;
                // PC+4 will be saved to rd
            end
            
            JALR: begin  // Jump and link register instruction
                reg_write = 1'b1;
                alu_src   = 1'b1;
                jump      = 1'b1;
                alu_ctrl  = ALU_ADD;  // Add offset to register
            end
            
            default: begin  // NOP or unknown instruction
                // All signals default to 0
            end
        endcase
    end
endmodule