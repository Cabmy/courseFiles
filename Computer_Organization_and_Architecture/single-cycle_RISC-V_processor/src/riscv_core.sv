module riscv_core(
    input  logic        clk,
    input  logic        reset,
    input  logic [31:0] instr,
    input  logic [31:0] mem_read_data,
    output logic [31:0] instr_addr,
    output logic [31:0] mem_addr,
    output logic [31:0] mem_write_data,
    output logic        mem_read_enable,
    output logic        mem_write_enable
);
    // Control signals
    logic        reg_write, alu_src, mem_to_reg, branch, jump;
    logic [3:0]  alu_ctrl;
    
    // Register file signals
    logic [4:0]  rs1, rs2, rd;
    logic [31:0] reg_write_data, reg_read_data1, reg_read_data2;
    
    // ALU signals
    logic [31:0] alu_operand1, alu_operand2, alu_result;
    logic        zero_flag;
    
    // Branch control signals
    logic branch_taken;
    logic is_bne;
    
    // Immediate generator signals
    logic [31:0] imm_ext;
    
    // PC signals
    logic [31:0] pc_next, pc_plus4, pc_target;
    
    // Extract register addresses from instruction
    assign rs1 = instr[19:15];
    assign rs2 = instr[24:20];
    assign rd = instr[11:7];
    
    // Program Counter logic
    assign pc_plus4 = instr_addr + 32'h4;
    assign pc_target = instr_addr + imm_ext;
    
    // Check if this is a BNE instruction
    assign is_bne = (instr[6:0] == 7'b1100011) && (instr[14:12] == 3'b001);
    
    // Determine if branch should be taken
    assign branch_taken = branch && ((is_bne && !zero_flag) || (!is_bne && zero_flag));
    
    // PC update logic
    always_comb begin
        if (jump)
            pc_next = pc_target;
        else if (branch_taken)
            pc_next = pc_target;
        else
            pc_next = pc_plus4;
    end
    
    // Program Counter register with synchronous reset
    always_ff @(posedge clk) begin
        if (reset)
            instr_addr <= 32'h0;
        else
            instr_addr <= pc_next;
    end
    
    // Control Unit
    control_unit ctrl_unit(
        .opcode(instr[6:0]),
        .funct3(instr[14:12]),
        .funct7(instr[31:25]),
        .reg_write(reg_write),
        .alu_src(alu_src),
        .mem_to_reg(mem_to_reg),
        .mem_read(mem_read_enable),
        .mem_write(mem_write_enable),
        .branch(branch),
        .jump(jump),
        .alu_ctrl(alu_ctrl)
    );
    
    // Calculate write data for register file
    // For JAL/JALR instructions, store PC+4 in rd
    // For other instructions, either ALU result or memory data
    logic [31:0] actual_write_data;
    always_comb begin
        if (jump) // For JAL/JALR instructions
            actual_write_data = pc_plus4;
        else if (mem_to_reg)
            actual_write_data = mem_read_data;
        else
            actual_write_data = alu_result;
    end
    
    // Register File
    register_file reg_file(
        .clk(clk),
        .reset(reset),
        .write_enable(reg_write),
        .rs1(rs1),
        .rs2(rs2),
        .rd(rd),
        .write_data(actual_write_data),
        .read_data1(reg_read_data1),
        .read_data2(reg_read_data2)
    );
    
    // Immediate Generator
    immediate_gen imm_generator(
        .instr(instr),
        .imm_ext(imm_ext)
    );
    
    // ALU
    assign alu_operand1 = reg_read_data1;
    assign alu_operand2 = alu_src ? imm_ext : reg_read_data2;
    
    alu main_alu(
        .operand1(alu_operand1),
        .operand2(alu_operand2),
        .alu_ctrl(alu_ctrl),
        .result(alu_result),
        .zero(zero_flag)
    );
    
    // Data memory interface
    assign mem_addr = alu_result;
    assign mem_write_data = reg_read_data2;
    
endmodule